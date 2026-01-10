import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useReturnTo } from '../../hooks/useReturnTo'
import ErrorAlert from '../../components/global/ErrorAlert'
import { crearAdditionalCharge, editarAdditionalCharge, fetchAdditionalCharge } from '../../api/additionalChargesApi'
import type { AdditionalChargeCreatePayload, AdditionalChargeUpdatePayload } from '../../api/types'

const AdditionalChargeFormPage: React.FC = () => {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { from, goBack } = useReturnTo('/additional-charges')

  const [nombre, setNombre] = useState('')
  const [porcentaje, setPorcentaje] = useState('0')
  const [montoMinimo, setMontoMinimo] = useState<string>('')
  const [siempreIncluir, setSiempreIncluir] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = useMemo(() => (isEdit ? 'Editar Cargo Adicional' : 'Nuevo Cargo Adicional'), [isEdit])

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return
      setLoading(true)
      setError(null)
      try {
        const data = await fetchAdditionalCharge(Number(id))
        setNombre(data.nombre)
        setPorcentaje(data.porcentaje)
        setMontoMinimo(data.monto_minimo ?? '')
        setSiempreIncluir(Boolean(data.siempre_incluir))
      } catch (e: any) {
        setError(e.response?.data?.error?.message ?? 'No se pudo cargar el registro.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isEdit])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const basePayload = {
        nombre,
        porcentaje,
        monto_minimo: montoMinimo.trim() ? montoMinimo : null,
        siempre_incluir: siempreIncluir
      }

      if (isEdit) {
        const payload: AdditionalChargeUpdatePayload = basePayload
        await editarAdditionalCharge(Number(id), payload)
        navigate(from ?? '/additional-charges', { state: { flash: { type: 'success', message: 'Cargo adicional actualizado.' } } })
      } else {
        const payload: AdditionalChargeCreatePayload = basePayload
        await crearAdditionalCharge(payload)
        navigate(from ?? '/additional-charges', { state: { flash: { type: 'success', message: 'Cargo adicional creado.' } } })
      }
    } catch (e: any) {
      setError(e.response?.data?.error?.message ?? 'No se pudo guardar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h2 className="mb-1">{title}</h2>
          <div className="text-muted small">
            Se calcula sobre (máquinas + accesorios). Se aplica <b>MAX(% calculado, mínimo)</b>.
          </div>
        </div>
        <button className="btn btn-outline-secondary rounded-pill" onClick={goBack}>
          Volver
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      <form onSubmit={onSubmit} className="row g-3">
        <div className="col-12">
          <label className="form-label">Nombre</label>
          <input className="form-control" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label">Porcentaje</label>
          <input className="form-control" value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)} required />
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label">Mínimo (U$D)</label>
          <input
            className="form-control"
            value={montoMinimo}
            onChange={(e) => setMontoMinimo(e.target.value)}
            placeholder="Ej: 450.00 (opcional)"
          />
          <div className="form-text">Si se setea, el cargo será MAX(% calculado, mínimo).</div>
        </div>

        <div className="col-12">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              checked={siempreIncluir}
              onChange={(e) => setSiempreIncluir(e.target.checked)}
              id="siempre_incluir"
            />
            <label className="form-check-label" htmlFor="siempre_incluir">
              Siempre incluir
            </label>
          </div>
        </div>

        <div className="col-12 d-flex gap-2">
          <button className="btn btn-primary rounded-pill" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={goBack}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

export default AdditionalChargeFormPage
