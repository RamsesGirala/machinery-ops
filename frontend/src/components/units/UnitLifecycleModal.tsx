import React, { useEffect, useMemo, useState } from 'react'
import ConfirmModal from '../../components/global/ConfirmModal'
import ErrorAlert from '../../components/global/ErrorAlert'
import {
  finishUnitRental,
  markUnitRented,
  markUnitSold,
} from '../../api/purchasedUnitsApi'
import{
  FinishRentalPayload,
  MarkRentedPayload,
  MarkSoldPayload,
} from '../../api/types/payloads'
import { drfErrorToMessage } from '../../utils/drfErrorToMessage'

export type UnitLifecycleMode = 'rent' | 'finish' | 'sell'

export type UnitLite = {
  id: number
  estado: string
  codigo_interno?: string | null
  serial_number?: string | null
}

type Props = {
  show: boolean
  mode: UnitLifecycleMode
  unit: UnitLite | null
  onClose: () => void
  onSuccess?: () => void // para refrescar list/detail
}

function todayYMD() {
  return new Date().toISOString().slice(0, 10)
}

export default function UnitLifecycleModal({ show, mode, unit, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [rentForm, setRentForm] = useState<MarkRentedPayload>({
    fecha_inicio: todayYMD(),
    fecha_retorno_estimada: todayYMD(),
    monto_total: '0.00',
    cliente_texto: '',
    notas: '',
  })

  const [finishForm, setFinishForm] = useState<FinishRentalPayload>({
    fecha_retorno_real: todayYMD(),
  })

  const [sellForm, setSellForm] = useState<MarkSoldPayload>({
    fecha_venta: todayYMD(),
    monto_total: '0.00',
    cliente_texto: '',
    notas: '',
  })

  // Reset liviano cuando cambia unit/mode o cuando abre
  useEffect(() => {
    if (!show) return
    setError(null)
    setLoading(false)
    // no reseteo montos a 0 siempre si querés recordar últimos valores;
    // por ahora lo dejamos simple:
    setRentForm((p) => ({ ...p, fecha_inicio: todayYMD(), fecha_retorno_estimada: todayYMD() }))
    setFinishForm({ fecha_retorno_real: todayYMD() })
    setSellForm((p) => ({ ...p, fecha_venta: todayYMD() }))
  }, [show, mode, unit?.id])

  const title = useMemo(() => {
    if (mode === 'rent') return 'Marcar unidad como alquilada'
    if (mode === 'finish') return 'Finalizar alquiler'
    return 'Marcar unidad como vendida'
  }, [mode])

  const confirmText = useMemo(() => {
    if (mode === 'rent') return 'Alquilar'
    if (mode === 'finish') return 'Finalizar'
    return 'Vender'
  }, [mode])

  const body = (
    <>
      {error ? <ErrorAlert message={error} /> : null}

      {unit ? (
        <div className="mb-2">
          <div className="text-muted small">Unidad</div>
          <div className="fw-semibold">
            #{unit.id} · {unit.codigo_interno ?? '—'} · {unit.serial_number ?? '—'} · <span className="text-muted">{unit.estado}</span>
          </div>
          <hr />
        </div>
      ) : null}

      {mode === 'rent' ? (
        <div className="row g-2">
          <div className="col-12 col-md-4">
            <label className="form-label">Fecha inicio</label>
            <input
              className="form-control"
              type="date"
              value={rentForm.fecha_inicio}
              onChange={(e) => setRentForm({ ...rentForm, fecha_inicio: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label">Devolución estimada</label>
            <input
              className="form-control"
              type="date"
              value={rentForm.fecha_retorno_estimada}
              onChange={(e) => setRentForm({ ...rentForm, fecha_retorno_estimada: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label">Monto total</label>
            <input
              className="form-control"
              inputMode="decimal"
              value={rentForm.monto_total}
              onChange={(e) => setRentForm({ ...rentForm, monto_total: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Cliente (opcional)</label>
            <input
              className="form-control"
              value={rentForm.cliente_texto ?? ''}
              onChange={(e) => setRentForm({ ...rentForm, cliente_texto: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="col-12">
            <label className="form-label">Notas (opcional)</label>
            <textarea
              className="form-control"
              value={rentForm.notas ?? ''}
              onChange={(e) => setRentForm({ ...rentForm, notas: e.target.value })}
              disabled={loading}
            />
          </div>
        </div>
      ) : null}

      {mode === 'finish' ? (
        <div className="row g-2">
          <div className="col-12 col-md-6">
            <label className="form-label">Fecha devolución real</label>
            <input
              className="form-control"
              type="date"
              value={finishForm.fecha_retorno_real}
              onChange={(e) => setFinishForm({ fecha_retorno_real: e.target.value })}
              disabled={loading}
            />
          </div>
          <div className="col-12">
            <div className="text-muted small">
              Se marcará la devolución real en el revenue del alquiler activo y la unidad volverá a DEPÓSITO.
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
              inputMode="decimal"
              value={sellForm.monto_total}
              onChange={(e) => setSellForm({ ...sellForm, monto_total: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label">Cliente (opcional)</label>
            <input
              className="form-control"
              value={sellForm.cliente_texto ?? ''}
              onChange={(e) => setSellForm({ ...sellForm, cliente_texto: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="col-12">
            <label className="form-label">Notas (opcional)</label>
            <textarea
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

  const onConfirm = async () => {
    if (!unit) return

    try {
      setLoading(true)
      setError(null)

      if (mode === 'rent') {
        await markUnitRented(unit.id, rentForm)
      } else if (mode === 'finish') {
        await finishUnitRental(unit.id, finishForm)
      } else {
        await markUnitSold(unit.id, sellForm)
      }

      onClose()
      onSuccess?.()
    } catch (e: any) {
      setError(drfErrorToMessage(e, 'No se pudo completar la acción.'))
    } finally {
      setLoading(false)
    }
  }

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
