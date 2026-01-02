import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ErrorAlert from '../../components/global/ErrorAlert'
import { drfErrorToMessage } from '../../utils/drfErrorToMessage'
import { crearTax, editarTax, fetchTax } from '../../api/taxesApi'
import type { TaxCreatePayload, TaxUpdatePayload } from '../../api/types'

const TaxFormPage: React.FC = () => {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [nombre, setNombre] = useState('')
  const [porcentaje, setPorcentaje] = useState('0')
  const [siempreIncluir, setSiempreIncluir] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = useMemo(() => (isEdit ? 'Editar Tax' : 'Nuevo Tax'), [isEdit])

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return
      setLoading(true)
      setError(null)
      try {
        const data = await fetchTax(Number(id))
        setNombre(data.nombre)
        setPorcentaje(data.porcentaje)
        setSiempreIncluir(Boolean(data.siempre_incluir))
      } catch (e: any) {
        setError(drfErrorToMessage(e, 'No se pudo cargar el tax.'))
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
      if (isEdit) {
        const payload: TaxUpdatePayload = { nombre, porcentaje, siempre_incluir: siempreIncluir }
        await editarTax(Number(id), payload)
        navigate('/taxes', { state: { flash: { type: 'success', message: 'Tax actualizado.' } } })
      } else {
        const payload: TaxCreatePayload = { nombre, porcentaje, siempre_incluir: siempreIncluir }
        await crearTax(payload)
        navigate('/taxes', { state: { flash: { type: 'success', message: 'Tax creado.' } } })
      }
    } catch (e: any) {
      setError(drfErrorToMessage(e, 'No se pudo guardar.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h2 className="mb-1">{title}</h2>
        </div>
        <button className="btn btn-outline-secondary rounded-pill" onClick={() => navigate(-1)}>
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
          <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={() => navigate('/taxes')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

export default TaxFormPage
