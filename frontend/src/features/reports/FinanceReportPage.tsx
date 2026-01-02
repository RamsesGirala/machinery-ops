import React, { useMemo, useState } from 'react'
import ErrorAlert from '../../components/global/ErrorAlert'
import { drfErrorToMessage } from '../../utils/drfErrorToMessage'
import { fetchFinanceReport, type FinanceDayRow, type FinanceReport } from '../../api/reportsApi'
import { formatDateYMD } from '../../utils/date'
import { formatUSD } from '../../utils/money'

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

function parseNum(s: any): number {
  const n = Number(String(s ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d.getTime())
  x.setDate(x.getDate() + days)
  return x
}

function daysDiffInclusive(desde: string, hasta: string): number {
  const d1 = new Date(desde + 'T00:00:00')
  const d2 = new Date(hasta + 'T00:00:00')
  const ms = d2.getTime() - d1.getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  return days + 1
}

type ChartRow = {
  label: string
  ingresos: number
  egresos: number
  ganancia: number
}

function aggregateMonthly(rows: FinanceDayRow[]): ChartRow[] {
  const map = new Map<string, ChartRow>()
  for (const r of rows) {
    const k = r.fecha.slice(0, 7) // YYYY-MM
    const cur = map.get(k) || { label: k, ingresos: 0, egresos: 0, ganancia: 0 }
    cur.ingresos += parseNum(r.ingresos)
    cur.egresos += parseNum(r.egresos)
    cur.ganancia += parseNum(r.ganancia)
    map.set(k, cur)
  }
  return Array.from(map.values()).sort((a, b) => (a.label > b.label ? 1 : -1))
}

export default function FinanceReportPage() {
  const today = useMemo(() => new Date(), [])
  const [desde, setDesde] = useState<string>(formatDateYMD(addDays(today, -30)))
  const [hasta, setHasta] = useState<string>(formatDateYMD(today))

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<FinanceReport | null>(null)

  async function onBuscar() {
    try {
      setLoading(true)
      setError(null)
      const rep = await fetchFinanceReport({ desde, hasta })
      setReport(rep)
    } catch (e: any) {
      setError(drfErrorToMessage(e))
    } finally {
      setLoading(false)
    }
  }

  function applyPreset(kind: '7d' | '30d' | '90d' | '365d') {
    const end = new Date()
    const start =
      kind === '7d'
        ? addDays(end, -6)
        : kind === '30d'
        ? addDays(end, -29)
        : kind === '90d'
        ? addDays(end, -89)
        : addDays(end, -364)

    const d = formatDateYMD(start)
    const h = formatDateYMD(end)
    setDesde(d)
    setHasta(h)
  }

  const chartData: ChartRow[] = useMemo(() => {
    if (!report) return []
    const days = daysDiffInclusive(report.desde, report.hasta)

    if (days <= 31) {
      return report.serie_diaria.map((r) => ({
        label: r.fecha,
        ingresos: parseNum(r.ingresos),
        egresos: parseNum(r.egresos),
        ganancia: parseNum(r.ganancia),
      }))
    }

    return aggregateMonthly(report.serie_diaria)
  }, [report])

  const granularityLabel = useMemo(() => {
    if (!report) return ''
    const days = daysDiffInclusive(report.desde, report.hasta)
    return days <= 31 ? 'Día a día' : 'Agrupado por mes'
  }, [report])

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

            <div className="col-12">
              <div className="d-flex flex-wrap gap-2">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => applyPreset('7d')}>
                  Última semana
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => applyPreset('30d')}>
                  Último mes
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => applyPreset('90d')}>
                  Últimos 3 meses
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => applyPreset('365d')}>
                  Último año
                </button>

                <div className="ms-auto text-muted small align-self-center">
                  {report ? `Vista: ${granularityLabel}` : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!report ? (
        <div className="text-muted">Elegí un rango y buscá.</div>
      ) : (
        <>
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4">
              <div className="card">
                <div className="card-body">
                  <div className="text-muted small">Ingresos</div>
                  <div className="h4 mb-0">{formatUSD(parseNum(report.totales.ingresos))}</div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card">
                <div className="card-body">
                  <div className="text-muted small">Egresos</div>
                  <div className="h4 mb-0">{formatUSD(parseNum(report.totales.egresos))}</div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card">
                <div className="card-body">
                  <div className="text-muted small">Ganancia</div>
                  <div className="h4 mb-0">{formatUSD(parseNum(report.totales.ganancia))}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <div className="card">
                <div className="card-body">
                  <div className="fw-semibold mb-2">Ingresos</div>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip formatter={(v: any) => formatUSD(v)} />
                        <Legend />
                        <Line type="monotone" dataKey="ingresos" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card">
                <div className="card-body">
                  <div className="fw-semibold mb-2">Egresos</div>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip formatter={(v: any) => formatUSD(v)} />
                        <Legend />
                        <Line type="monotone" dataKey="egresos" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <div className="fw-semibold mb-2">Ganancia</div>
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip formatter={(v: any) => formatUSD(v)} />
                        <Legend />
                        <Bar dataKey="ganancia" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
