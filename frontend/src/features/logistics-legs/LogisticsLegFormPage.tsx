import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ErrorAlert from '../../components/global/ErrorAlert'
import { drfErrorToMessage } from '../../utils/drfErrorToMessage'
import { crearLogisticsLeg, editarLogisticsLeg, fetchLogisticsLeg } from '../../api/logisticsLegsApi'
import type { EtapaEnum, LogisticsLegCreatePayload, LogisticsLegUpdatePayload, TipoEnum } from '../../api/types'

const TIPOS: TipoEnum[] = ['TERRESTRE', 'AEREO', 'MARITIMO']
const ETAPAS: EtapaEnum[] = ['HASTA_ADUANA', 'POST_ADUANA']

const LogisticsLegFormPage: React.FC = () => {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [tipo, setTipo] = useState<TipoEnum>('TERRESTRE')
  const [etapa, setEtapa] = useState<EtapaEnum>('HASTA_ADUANA')
  const [total, setTotal] = useState('0')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = useMemo(() => (isEdit ? 'Editar Logistics Leg' : 'Nuevo Logistics Leg'), [isEdit])

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return
      setLoading(true)
      setError(null)
      try {
        const data = await fetchLogisticsLeg(Number(id))
        setDesde(data.desde)
        setHasta(data.hasta)
        setTipo(data.tipo)
        setEtapa(data.etapa)
        setTotal(data.total)
      } catch (e: any) {
        setError(drfErrorToMessage(e, 'No se pudo cargar el logistics leg.'))
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
        const payload: LogisticsLegUpdatePayload = { desde, hasta, tipo, etapa, total }
        await editarLogisticsLeg(Number(id), payload)
        navigate('/logistics-legs', { state: { flash: { type: 'success', message: 'Logistics leg actualizado.' } } })
      } else {
        const payload: LogisticsLegCreatePayload = { desde, hasta, tipo, etapa, total }
        await crearLogisticsLeg(payload)
        navigate('/logistics-legs', { state: { flash: { type: 'success', message: 'Logistics leg creado.' } } })
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
        <div className="col-12 col-md-6">
          <label className="form-label">Desde</label>
          <input className="form-control" value={desde} onChange={(e) => setDesde(e.target.value)} required />
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label">Hasta</label>
          <input className="form-control" value={hasta} onChange={(e) => setHasta(e.target.value)} required />
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label">Tipo</label>
          <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value as TipoEnum)}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label">Etapa</label>
          <select className="form-select" value={etapa} onChange={(e) => setEtapa(e.target.value as EtapaEnum)}>
            {ETAPAS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label">Total</label>
          <input className="form-control" value={total} onChange={(e) => setTotal(e.target.value)} required />
        </div>

        <div className="col-12 d-flex gap-2">
          <button className="btn btn-primary rounded-pill" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={() => navigate('/logistics-legs')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

export default LogisticsLegFormPage
