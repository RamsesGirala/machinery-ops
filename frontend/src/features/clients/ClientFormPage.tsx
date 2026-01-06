import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useReturnTo } from '../../hooks/useReturnTo'
import ErrorAlert from '../../components/global/ErrorAlert'
import { drfErrorToMessage } from '../../utils/drfErrorToMessage'
import { crearClient, editarClient, fetchClient } from '../../api/clientsApi'
import type { ClientCreatePayload, ClientUpdatePayload } from '../../api/types'

const ClientFormPage: React.FC = () => {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { from, goBack } = useReturnTo('/clients')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = useMemo(() => (isEdit ? 'Editar Cliente' : 'Nuevo Cliente'), [isEdit])

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return
      setLoading(true)
      setError(null)
      try {
        const data = await fetchClient(Number(id))
        setNombre(data.nombre)
        setTelefono(data.telefono ?? '')
        setEmail(data.email ?? '')
      } catch (e: any) {
        setError(drfErrorToMessage(e, 'No se pudo cargar el cliente.'))
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
      const payloadBase = {
        nombre,
        telefono: telefono.trim() ? telefono : null,
        email: email.trim() ? email : null
      }

      if (isEdit) {
        const payload: ClientUpdatePayload = payloadBase
        await editarClient(Number(id), payload)
        navigate(from ?? '/clients', { state: { flash: { type: 'success', message: 'Cliente actualizado.' } } })
      } else {
        const payload: ClientCreatePayload = payloadBase
        await crearClient(payload)
        navigate(from ?? '/clients', { state: { flash: { type: 'success', message: 'Cliente creado.' } } })
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

        <div className="col-12 col-md-6">
          <label className="form-label">Teléfono</label>
          <input className="form-control" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label">Email</label>
          <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
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

export default ClientFormPage
