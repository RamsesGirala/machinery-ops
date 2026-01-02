import React, { useMemo, useState } from 'react'
import ErrorAlert from '../../components/global/ErrorAlert'
import { drfErrorToMessage } from '../../utils/drfErrorToMessage'
import { fetchFinanceReport } from '../../api/reportsApi'
import { formatDateYMD } from '../../utils/date'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts'

function toNum(v: string) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function money(v: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v)
}

export default function FinanceReportPage() {
  const today = formatDateYMD(new Date().toISOString())
  const [desde, setDesde] = useState(today)
  const [hasta, setHasta] = useState(today)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [totales, setTotales] = useState<{ ingresos: string; egresos: string; ganancia: string } | null>(null)
  const [serie, setSerie] = useState<Array<{ fecha: string; ingresos: string; egresos: string; ganancia: string }>>([])

  const data = useMemo(
    () =>
      serie.map((x) => ({
        fecha: x.fecha,
        ingresos: toNum(x.ingresos),
        egresos: toNum(x.egresos),
        ganancia: toNum(x.ganancia),
      })),
    [serie]
  )

  const totIng = totales ? toNum(totales.ingresos) : 0
  const totEgr = totales ? toNum(totales.egresos) : 0
  const totGan = totales ? toNum(totales.ganancia) : 0

  const onBuscar = async () => {
    try {
      setLoading(true)
      setError(null)
      const rep = await fetchFinanceReport({ desde, hasta })
      setTotales(rep.totales)
      setSerie(rep.serie_diaria)
    } catch (e: any) {
      setError(drfErrorToMessage(e, 'No se pudo cargar el reporte.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h1 className="h3 mb-0">Reportes</h1>
          <div className="text-muted small">Finanzas · ingresos, egresos y ganancia</div>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-4">
              <label className="form-label">Desde</label>
              <input className="form-control" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Hasta</label>
              <input className="form-control" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div className="col-12 col-md-4">
              <button className="btn btn-primary w-100" onClick={onBuscar} disabled={loading}>
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {totales ? (
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-4">
            <div className="card">
              <div className="card-body">
                <div className="text-muted small">Ingresos</div>
                <div className="h4 mb-0">{money(totIng)}</div>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="card">
              <div className="card-body">
                <div className="text-muted small">Egresos</div>
                <div className="h4 mb-0">{money(totEgr)}</div>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="card">
              <div className="card-body">
                <div className="text-muted small">Ganancia</div>
                <div className="h4 mb-0">{money(totGan)}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!data.length ? (
        <div className="text-muted">Elegí un rango y tocá “Buscar”.</div>
      ) : (
        <div className="row g-3">
          {/* 1) Linea: Ingresos */}
          <div className="col-12 col-lg-6">
            <div className="card">
              <div className="card-body">
                <div className="fw-semibold mb-2">Ingresos (por día)</div>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <Tooltip formatter={(v: any) => money(Number(v))} />
                      <Legend />
                      <Line type="monotone" dataKey="ingresos" stroke="#0d6efd" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* 2) Linea: Egresos */}
          <div className="col-12 col-lg-6">
            <div className="card">
              <div className="card-body">
                <div className="fw-semibold mb-2">Egresos (por día)</div>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <Tooltip formatter={(v: any) => money(Number(v))} />
                      <Legend />
                      <Line type="monotone" dataKey="egresos" stroke="#dc3545" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* 3) Linea: Ganancia */}
          <div className="col-12 col-lg-6">
            <div className="card">
              <div className="card-body">
                <div className="fw-semibold mb-2">Ganancia (por día)</div>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <Tooltip formatter={(v: any) => money(Number(v))} />
                      <Legend />
                      <Line type="monotone" dataKey="ganancia" stroke="#198754" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* 4) Barras: Ingresos vs Egresos */}
          <div className="col-12 col-lg-6">
            <div className="card">
              <div className="card-body">
                <div className="fw-semibold mb-2">Ingresos vs Egresos</div>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <Tooltip formatter={(v: any) => money(Number(v))} />
                      <Legend />
                      <Bar dataKey="ingresos" fill="#0d6efd" />
                      <Bar dataKey="egresos" fill="#dc3545" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
