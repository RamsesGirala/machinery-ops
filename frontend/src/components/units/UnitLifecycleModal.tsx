import React, { useEffect, useMemo, useState } from 'react'
import ConfirmModal from '../../components/global/ConfirmModal'
import ErrorAlert from '../../components/global/ErrorAlert'
import { fetchClientsAll } from '../../api/clientsApi'
import type { Client } from '../../api/types/models'
import { finishUnitRental, markUnitRented, markUnitSold } from '../../api/purchasedUnitsApi'
import { FinishRentalPayload, MarkRentedPayload, MarkSoldPayload } from '../../api/types/payloads'
import type { PurchasedUnitDetail, PurchasedUnit } from '../../api/types/models'
import { drfErrorToMessage } from '../../utils/drfErrorToMessage'
import { suggestMonthlyRent, suggestSaleTotal } from '../../config/pricing'
import { formatUSD } from '../../utils/money'

export type UnitLifecycleMode = 'rent' | 'finish' | 'sell'

// Para poder abrir el modal desde listado (sin detalle) y desde detalle (con total_compra)
export type UnitLite = PurchasedUnit | PurchasedUnitDetail

type Props = {
  show: boolean
  mode: UnitLifecycleMode
  unit: UnitLite | null
  onClose: () => void
  onSuccess: () => void
}

function toNumberSafe(v: any): number {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function daysInclusive(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0
  const diff = Math.floor((e.getTime() - s.getTime()) / 86400000)
  return diff >= 0 ? diff + 1 : 0
}

function weeksInclusive(start: string, end: string): number {
  const d = daysInclusive(start, end)
  return d <= 0 ? 0 : Math.floor((d - 1) / 7) + 1
}

function monthsInclusiveDates(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0
  const sm = s.getFullYear() * 12 + (s.getMonth() + 1)
  const em = e.getFullYear() * 12 + (e.getMonth() + 1)
  return em >= sm ? (em - sm) + 1 : 0
}


export default function UnitLifecycleModal({ show, mode, unit, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const cost = useMemo(() => toNumberSafe((unit as any)?.total_compra), [unit])

  const [rentForm, setRentForm] = useState<MarkRentedPayload>(() => ({
    cliente_id: 0,
    rental_tipo: 'MENSUAL',
    rental_inicio: new Date().toISOString().slice(0, 10),
    rental_fin_estimado: new Date().toISOString().slice(0, 10),
    monto_unitario: '',
    metodo_pago: 'TRANSFERENCIA',
    pago_unico: false,
    notas: '',
  }))

  const [finishForm, setFinishForm] = useState<FinishRentalPayload>(() => ({
    rental_fin_real: new Date().toISOString().slice(0, 10),
  }))

  const [sellForm, setSellForm] = useState<MarkSoldPayload>(() => ({
    cliente_id: 0,
    fecha_operacion: new Date().toISOString().slice(0, 10),
    monto_total_final: '',
    metodo_pago: 'TRANSFERENCIA',
    cheques_cuotas: 1,
    notas: '',
  }))

  // Cada vez que abrimos o cambia la unidad, sugerimos valores iniciales
  useEffect(() => {
    if (!show || !unit) return

    ;(async () => {
      try {
        const cs = await fetchClientsAll()
        setClients(cs)
      } catch {
        // silencioso
      }
    })()

    setError(null)

    const today = new Date().toISOString().slice(0, 10)

    if (mode === 'rent') {
      const suggestedMonthly = suggestMonthlyRent(cost)
      setRentForm({
        cliente_id: 0,
        rental_tipo: 'MENSUAL',
        rental_inicio: today,
        rental_fin_estimado: today,
        monto_unitario: suggestedMonthly ? String(Math.round(suggestedMonthly)) : '',
        metodo_pago: 'TRANSFERENCIA',
        pago_unico: false,
        notas: '',
      })
    }

    if (mode === 'finish') {
      setFinishForm({ rental_fin_real: today })
    }

    if (mode === 'sell') {
      const suggestedSale = suggestSaleTotal(cost)
      setSellForm({
        cliente_id: 0,
        fecha_operacion: today,
        monto_total_final: suggestedSale ? String(Math.round(suggestedSale)) : '',
        metodo_pago: 'TRANSFERENCIA',
        cheques_cuotas: 1,
        notas: '',
      })
    }
  }, [show, (unit as any)?.id, mode, cost])

  const rentPreview = useMemo(() => {
    const unitPrice = toNumberSafe(rentForm.monto_unitario)

    let n = 0
    if (rentForm.rental_tipo === 'MENSUAL') {
      n = monthsInclusiveDates(rentForm.rental_inicio, rentForm.rental_fin_estimado)
    } else if (rentForm.rental_tipo === 'SEMANAL') {
      n = weeksInclusive(rentForm.rental_inicio, rentForm.rental_fin_estimado)
    } else {
      n = daysInclusive(rentForm.rental_inicio, rentForm.rental_fin_estimado)
    }

    const total = n * unitPrice
    return { n, total }
  }, [rentForm.rental_tipo, rentForm.rental_inicio, rentForm.rental_fin_estimado, rentForm.monto_unitario])


  async function onConfirm() {
      if (!unit) return
      try {
        setLoading(true)
        setError(null)

      if (mode === 'rent') {
        await markUnitRented((unit as any).id, {
          cliente_id: Number(rentForm.cliente_id),
          rental_tipo: rentForm.rental_tipo,
          rental_inicio: rentForm.rental_inicio,
          rental_fin_estimado: rentForm.rental_fin_estimado,
          monto_unitario: String(rentForm.monto_unitario ?? ''),
          metodo_pago: rentForm.metodo_pago,
          pago_unico: Boolean(rentForm.pago_unico),
          notas: rentForm.notas ?? '',
        })
      } else if (mode === 'finish') {
        await finishUnitRental((unit as any).id, {
          rental_fin_real: finishForm.rental_fin_real,
        })
      } else {
          await markUnitSold((unit as any).id, {
            cliente_id: Number(sellForm.cliente_id),
            fecha_operacion: sellForm.fecha_operacion,
            monto_total_final: String(sellForm.monto_total_final ?? ''),
            metodo_pago: sellForm.metodo_pago,
            cheques_cuotas: Number(sellForm.cheques_cuotas ?? 1),
            notas: sellForm.notas ?? '',
          })
        }


      onSuccess()
      onClose()
    } catch (e: any) {
      setError(drfErrorToMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const title =
    mode === 'rent' ? 'Alquilar unidad'
    : mode === 'finish' ? 'Finalizar alquiler'
    : 'Vender unidad'

  const confirmText =
    mode === 'rent' ? 'Alquilar'
    : mode === 'finish' ? 'Marcar devuelta'
    : 'Vender'


  const body = (
    <>
      {error ? <ErrorAlert message={error} /> : null}

      {unit ? (
        <div className="mb-2">
          <div className="text-muted small">Unidad</div>
          <div className="fw-semibold">
            #{(unit as any).id} · {(unit as any).identificador || '—'} · {(unit as any).machine_nombre} ·{' '}
            <span className="text-muted">{(unit as any).estado}</span>
          </div>
          <div className="text-muted small">
            Costo compra: {formatUSD((unit as any).total_compra)}
          </div>
          <hr />
        </div>
      ) : null}

      {mode === 'rent' ? (
        <div className="row g-2">
          <div className="col-12">
            <label className="form-label">Cliente</label>
            <select className="form-select" value={rentForm.cliente_id} onChange={(e) => setRentForm({ ...rentForm, cliente_id: Number(e.target.value) })} disabled={loading}>
              <option value={0}>— Seleccionar —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="col-6">
            <label className="form-label">Inicio</label>
            <input className="form-control" type="date" value={rentForm.rental_inicio} onChange={(e) => setRentForm({ ...rentForm, rental_inicio: e.target.value })} disabled={loading} />
          </div>

          <div className="col-6">
            <label className="form-label">Fin estimado</label>
            <input className="form-control" type="date" value={rentForm.rental_fin_estimado} onChange={(e) => setRentForm({ ...rentForm, rental_fin_estimado: e.target.value })} disabled={loading} />
          </div>

          <div className="col-6">
            <label className="form-label">Tipo</label>
            <select className="form-select" value={rentForm.rental_tipo} onChange={(e) => setRentForm({ ...rentForm, rental_tipo: e.target.value as any })} disabled={loading}>
              <option value="MENSUAL">Mensual</option>
              <option value="SEMANAL">Semanal</option>
              <option value="DIARIO">Diario</option>
            </select>
          </div>

          <div className="col-6">
            <label className="form-label">Monto unitario</label>
            <input className="form-control" type="number" value={rentForm.monto_unitario} onChange={(e) => setRentForm({ ...rentForm, monto_unitario: e.target.value })} disabled={loading} />
          </div>

          <div className="col-6">
            <label className="form-label">Método de pago</label>
            <select className="form-select" value={rentForm.metodo_pago} onChange={(e) => setRentForm({ ...rentForm, metodo_pago: e.target.value as any })} disabled={loading}>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="TARJETA_CREDITO">Tarjeta crédito</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div className="col-6 d-flex align-items-end">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" checked={!!rentForm.pago_unico} onChange={(e) => setRentForm({ ...rentForm, pago_unico: e.target.checked })} disabled={loading} />
              <label className="form-check-label">Pago único</label>
            </div>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Notas</label>
            <input
              className="form-control"
              value={rentForm.notas ?? ''}
              onChange={(e) => setRentForm({ ...rentForm, notas: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="col-12">
            <div className="text-muted small">
              Total estimado: <b>{formatUSD(rentPreview.total)}</b> · Cant. períodos: <b>{rentPreview.n}</b>
            </div>
          </div>

        </div>
      ) : null}

      {mode === 'finish' ? (
        <div className="row g-2">
          <div className="col-12 col-md-4">
            <label className="form-label">Fecha retorno real</label>
            <input
              type="date"
              className="form-control"
              value={finishForm.rental_fin_real}
              onChange={(e) => setFinishForm({ ...finishForm, rental_fin_real: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="col-12">
            <div className="text-muted small">
              Se marcará la devolución real en el alquiler activo y la unidad volverá a DEPÓSITO.
            </div>
          </div>
        </div>
      ) : null}


      {mode === 'sell' ? (
        <div className="row g-2">
          <div className="col-12">
            <label className="form-label">Cliente</label>
            <select
              className="form-select"
              value={sellForm.cliente_id}
              onChange={(e) => setSellForm({ ...sellForm, cliente_id: Number(e.target.value) })}
              disabled={loading}
            >
              <option value={0}>— Seleccionar —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label">Fecha venta</label>
            <input
              className="form-control"
              type="date"
              value={sellForm.fecha_operacion}
              onChange={(e) => setSellForm({ ...sellForm, fecha_operacion: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label">Monto total</label>
            <input
              className="form-control"
              type="number"
              value={sellForm.monto_total_final}
              onChange={(e) => setSellForm({ ...sellForm, monto_total_final: e.target.value })}
              disabled={loading}
            />
            <div className="text-muted small mt-1">
              Sugerido: {formatUSD(Math.round(suggestSaleTotal(cost)))}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label">Método de pago</label>
            <select
              className="form-select"
              value={sellForm.metodo_pago}
              onChange={(e) => setSellForm({ ...sellForm, metodo_pago: e.target.value as any })}
              disabled={loading}
            >
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="TARJETA_CREDITO">Tarjeta crédito</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          {sellForm.metodo_pago === 'CHEQUE' ? (
            <div className="col-12 col-md-4">
              <label className="form-label">Cuotas (cheques)</label>
              <input
                className="form-control"
                type="number"
                min={1}
                value={sellForm.cheques_cuotas ?? 1}
                onChange={(e) => setSellForm({ ...sellForm, cheques_cuotas: Number(e.target.value || 1) })}
                disabled={loading}
              />
              <div className="text-muted small mt-1">
                Se generarán {sellForm.cheques_cuotas ?? 1} pagos iguales.
              </div>
            </div>
          ) : null}


          <div className="col-12">
            <label className="form-label">Notas</label>
            <input
              className="form-control"
              value={sellForm.notas ?? ''}
              onChange={(e) => setSellForm({ ...sellForm, notas: e.target.value })}
              disabled={loading}
            />
          </div>
        </div>
      ) : null}

    </>
  )

  return (
    <ConfirmModal
      show={show}
      title={title}
      body={body}
      confirmText={confirmText}
      cancelText="Cancelar"
      confirmVariant={mode === 'sell' ? 'danger' : mode === 'finish' ? 'success' : 'primary'}
      onConfirm={onConfirm}
      onCancel={onClose}
      confirmDisabled={loading || !unit}
      cancelDisabled={loading}
    />
  )
}
