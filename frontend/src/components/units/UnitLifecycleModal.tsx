import React, { useEffect, useMemo, useState } from 'react'
import ConfirmModal from '../../components/global/ConfirmModal'
import ErrorAlert from '../../components/global/ErrorAlert'
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

function monthsInclusive(sy: number, sm: number, ey: number, em: number): number {
  const start = sy * 12 + sm
  const end = ey * 12 + em
  return end >= start ? (end - start) + 1 : 0
}

function nowYM() {
  const d = new Date()
  return { y: d.getFullYear(), m: d.getMonth() + 1 }
}

export default function UnitLifecycleModal({ show, mode, unit, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cost = useMemo(() => toNumberSafe((unit as any)?.total_compra), [unit])

  const [rentForm, setRentForm] = useState<MarkRentedPayload>(() => {
    const { y, m } = nowYM()
    return {
      inicio_year: y,
      inicio_month: m,
      retorno_estimada_year: y,
      retorno_estimada_month: m,
      monto_mensual: '',
      notas: '',
    }
  })

  const [finishForm, setFinishForm] = useState<FinishRentalPayload>(() => {
    const { y, m } = nowYM()
    return { retorno_real_year: y, retorno_real_month: m }
  })

  const [sellForm, setSellForm] = useState<MarkSoldPayload>(() => ({
    fecha_venta: new Date().toISOString().slice(0, 10),
    monto_total: '',
    notas: '',
  }))

  // Cada vez que abrimos o cambia la unidad, sugerimos valores iniciales
  useEffect(() => {
    if (!show || !unit) return
    setError(null)

    const { y, m } = nowYM()

    if (mode === 'rent') {
      const suggestedMonthly = suggestMonthlyRent(cost)
      setRentForm({
        inicio_year: y,
        inicio_month: m,
        retorno_estimada_year: y,
        retorno_estimada_month: m,
        monto_mensual: suggestedMonthly ? String(Math.round(suggestedMonthly)) : '',
        notas: '',
      })
    }

    if (mode === 'finish') {
      setFinishForm({ retorno_real_year: y, retorno_real_month: m })
    }

    if (mode === 'sell') {
      const suggestedSale = suggestSaleTotal(cost)
      setSellForm({
        fecha_venta: new Date().toISOString().slice(0, 10),
        monto_total: suggestedSale ? String(Math.round(suggestedSale)) : '',
        notas: '',
      })
    }
  }, [show, (unit as any)?.id, mode, cost])

  const title = useMemo(() => {
    if (mode === 'rent') return 'Alquilar unidad'
    if (mode === 'finish') return 'Finalizar alquiler'
    return 'Vender unidad'
  }, [mode])

  const confirmText = useMemo(() => {
    if (mode === 'rent') return 'Alquilar'
    if (mode === 'finish') return 'Finalizar'
    return 'Vender'
  }, [mode])

  const rentPreview = useMemo(() => {
    const meses = monthsInclusive(
      Number(rentForm.inicio_year),
      Number(rentForm.inicio_month),
      Number(rentForm.retorno_estimada_year),
      Number(rentForm.retorno_estimada_month),
    )
    const mensual = toNumberSafe(rentForm.monto_mensual)
    const total = meses * mensual
    return { meses, total }
  }, [rentForm])

  async function onConfirm() {
    if (!unit) return
    try {
      setLoading(true)
      setError(null)

      if (mode === 'rent') {
        await markUnitRented((unit as any).id, {
          ...rentForm,
          inicio_year: Number(rentForm.inicio_year),
          inicio_month: Number(rentForm.inicio_month),
          retorno_estimada_year: Number(rentForm.retorno_estimada_year),
          retorno_estimada_month: Number(rentForm.retorno_estimada_month),
          monto_mensual: String(rentForm.monto_mensual ?? ''),
          notas: rentForm.notas ?? '',
        })
      } else if (mode === 'finish') {
        await finishUnitRental((unit as any).id, {
          retorno_real_year: Number(finishForm.retorno_real_year),
          retorno_real_month: Number(finishForm.retorno_real_month),
        })
      } else {
        await markUnitSold((unit as any).id, {
          fecha_venta: sellForm.fecha_venta,
          monto_total: String(sellForm.monto_total ?? ''),
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
          <div className="col-6 col-md-3">
            <label className="form-label">Inicio · Año</label>
            <input
              className="form-control"
              type="number"
              value={rentForm.inicio_year}
              onChange={(e) => setRentForm({ ...rentForm, inicio_year: Number(e.target.value) })}
              disabled={loading}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label">Inicio · Mes</label>
            <input
              className="form-control"
              type="number"
              min={1}
              max={12}
              value={rentForm.inicio_month}
              onChange={(e) => setRentForm({ ...rentForm, inicio_month: Number(e.target.value) })}
              disabled={loading}
            />
          </div>

          <div className="col-6 col-md-3">
            <label className="form-label">Retorno est. · Año</label>
            <input
              className="form-control"
              type="number"
              value={rentForm.retorno_estimada_year}
              onChange={(e) => setRentForm({ ...rentForm, retorno_estimada_year: Number(e.target.value) })}
              disabled={loading}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label">Retorno est. · Mes</label>
            <input
              className="form-control"
              type="number"
              min={1}
              max={12}
              value={rentForm.retorno_estimada_month}
              onChange={(e) => setRentForm({ ...rentForm, retorno_estimada_month: Number(e.target.value) })}
              disabled={loading}
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Monto mensual</label>
            <input
              className="form-control"
              type="number"
              value={rentForm.monto_mensual}
              onChange={(e) => setRentForm({ ...rentForm, monto_mensual: e.target.value })}
              disabled={loading}
            />
            <div className="text-muted small mt-1">
              Sugerido: {formatUSD(Math.round(suggestMonthlyRent(cost)))}
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
              Total estimado: <b>{formatUSD(rentPreview.total)}</b> · Meses: <b>{rentPreview.meses}</b>
            </div>
          </div>
        </div>
      ) : null}

      {mode === 'finish' ? (
        <div className="row g-2">
          <div className="col-6 col-md-3">
            <label className="form-label">Retorno real · Año</label>
            <input
              className="form-control"
              type="number"
              value={finishForm.retorno_real_year}
              onChange={(e) => setFinishForm({ ...finishForm, retorno_real_year: Number(e.target.value) })}
              disabled={loading}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label">Retorno real · Mes</label>
            <input
              className="form-control"
              type="number"
              min={1}
              max={12}
              value={finishForm.retorno_real_month}
              onChange={(e) => setFinishForm({ ...finishForm, retorno_real_month: Number(e.target.value) })}
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
          <div className="col-12 col-md-4">
            <label className="form-label">Fecha venta</label>
            <input
              className="form-control"
              type="date"
              value={sellForm.fecha_venta}
              onChange={(e) => setSellForm({ ...sellForm, fecha_venta: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label">Monto total</label>
            <input
              className="form-control"
              type="number"
              value={sellForm.monto_total}
              onChange={(e) => setSellForm({ ...sellForm, monto_total: e.target.value })}
              disabled={loading}
            />
            <div className="text-muted small mt-1">
              Sugerido: {formatUSD(Math.round(suggestSaleTotal(cost)))}
            </div>
          </div>

          <div className="col-12 col-md-4">
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
