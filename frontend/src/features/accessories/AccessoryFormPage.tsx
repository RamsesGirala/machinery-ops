import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useReturnTo } from '../../hooks/useReturnTo'
import ErrorAlert from '../../components/global/ErrorAlert'
import { drfErrorToMessage } from '../../utils/drfErrorToMessage'
import { crearAccessory, editarAccessory, fetchAccessory } from '../../api/accessoriesApi'
import type { AccessoryCreatePayload, AccessoryUpdatePayload } from '../../api/types'

const AccessoryFormPage: React.FC = () => {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { from, goBack } = useReturnTo('/accessories')
  const [nombre, setNombre] = useState('')
  const [total, setTotal] = useState('0')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = useMemo(() => (isEdit ? 'Editar Accesorio' : 'Nuevo Accesorio'), [isEdit])

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return
      setLoading(true)
      setError(null)
      try {
        const data = await fetchAccessory(Number(id))
        setNombre(data.nombre)
        setTotal(data.total)
      } catch (e: any) {
        setError(e.response.data.error.message)
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
        const payload: AccessoryUpdatePayload = { nombre, total }
        await editarAccessory(Number(id), payload)
        navigate(from ?? '/accessories', { state: { flash: { type: 'success', message: 'Accesorio actualizado.' } } })
      } else {
        const payload: AccessoryCreatePayload = { nombre, total }
        await crearAccessory(payload)
        navigate(from ?? '/accessories', { state: { flash: { type: 'success', message: 'Accesorio creado.' } } })
      }
    } catch (e: any) {
      setError(e.response.data.error.message)
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
        <button className="btn btn-outline-secondary rounded-pill" onClick={goBack}>
          Volver
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      <form onSubmit={onSubmit} className="row g-3">
        <div className="col-12">
          <label className="form-label">Nombre</label>
          <input
            className="form-control"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            placeholder="Ej: Kit hidráulico"
          />
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label">Total</label>
          <input
            className="form-control"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            required
            placeholder="0"
          />
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

export default AccessoryFormPage
