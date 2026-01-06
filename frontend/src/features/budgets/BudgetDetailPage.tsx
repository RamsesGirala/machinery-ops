import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchBudget, getBudgetPdfUrl } from '../../api/budgetsApi'
import type { BudgetDetail } from '../../api/types/models'
import ErrorAlert from '../../components/global/ErrorAlert'
import { formatUSD } from '../../utils/money'
import { formatDateAR } from '../../utils/date'
import { useReturnTo } from '../../hooks/useReturnTo'

export default function BudgetDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const budgetId = Number(id)
  const { goBack } = useReturnTo('/budgets')
  const [data, setData] = useState<BudgetDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [rentabilidad, setRentabilidad] = useState<string>('15')

  function onExportPdf() {
    if (!Number.isFinite(budgetId)) return
    const url = getBudgetPdfUrl(budgetId, rentabilidad)
    window.open(url, '_blank', 'noopener,noreferrer')
  }


  async function load() {
    try {
      setError(null)
      const b = await fetchBudget(budgetId)
      setData(b)
    } catch {
      setError('No se pudo cargar el presupuesto.')
    }
  }

  useEffect(() => {
    if (Number.isFinite(budgetId)) load()
  }, [budgetId])

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-start justify-content-between mb-3">
        <div>
          <h2 className="mb-1">Presupuesto</h2>
          <div className="text-muted">
            {data ? `${data.numero} · ${formatDateAR(data.fecha)}${data.cliente ? ` · ${data.cliente.nombre}` : ''}` : 'Cargando...'}
          </div>
        </div>

        <div className="d-flex gap-2 align-items-end">
          <div>
            <label className="form-label mb-1 text-muted" style={{ fontSize: 12 }}>
              Rentabilidad (%)
            </label>
            <input
              className="form-control form-control-sm"
              style={{ width: 140 }}
              value={rentabilidad}
              onChange={(e) => setRentabilidad(e.target.value)}
              placeholder="0"
              inputMode="decimal"
            />
          </div>

          <button className="btn btn-sm btn-outline-primary" onClick={onExportPdf} disabled={!data}>
            Exportar PDF
          </button>

          <button className="btn btn-outline-secondary" onClick={goBack}>
            Volver
          </button>
        </div>

      </div>

      {error && <ErrorAlert message={error} />}
      {!data ? null : (
        <>
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <div className="card"><div className="card-body">
                <div className="text-muted">Base pre-impuestos</div>
                <div className="fs-4">{formatUSD(data.base_pre_impuestos_snapshot)}</div>
              </div></div>
            </div>
            <div className="col-md-3">
              <div className="card"><div className="card-body">
                <div className="text-muted">Costos pre-impuestos</div>
                <div className="fs-4">{formatUSD(data.total_pretax_charges_snapshot)}</div>
              </div></div>
            </div>
            <div className="col-md-2">
              <div className="card"><div className="card-body">
                <div className="text-muted">Base imponible</div>
                <div className="fs-4">{formatUSD(data.base_imponible_snapshot)}</div>
              </div></div>
            </div>
            <div className="col-md-2">
              <div className="card"><div className="card-body">
                <div className="text-muted">Impuestos</div>
                <div className="fs-4">{formatUSD(data.total_impuestos_snapshot)}</div>
              </div></div>
            </div>
            <div className="col-md-2">
              <div className="card"><div className="card-body">
                <div className="text-muted">Total</div>
                <div className="fs-4">{formatUSD(data.total_snapshot)}</div>
              </div></div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h5>Items</h5>
              {data.items.map((it) => (
                <div key={it.id} className="border rounded p-2 mb-2">
                  <div className="d-flex justify-content-between">
                    <div><strong>{it.machine_nombre}</strong> x {it.cantidad}</div>
                    <div>{formatUSD(it.subtotal_maquina_snapshot)}</div>
                  </div>
                  {it.accesorios.length > 0 && (
                    <div className="mt-2 text-muted">
                      <div><strong>Accesorios</strong></div>
                      <ul className="mb-0">
                        {it.accesorios.map(a => (
                          <li key={a.id}>
                            {a.accessory_nombre} x {a.cantidad} — {formatUSD(a.subtotal_snapshot)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h5>Logística</h5>
              <ul className="mb-0">
                {data.logisticas.map(l => (
                  <li key={l.id}>
                    {l.desde} → {l.hasta} ({l.tipo}, {l.etapa}) — {formatUSD(l.total_snapshot)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="card mb-3">
            <div className="card-body">
              <h5>Costos pre-impuestos</h5>
              <ul className="mb-0">
                {data.pretax_charges.length === 0 ? (
                  <li className="text-muted">Sin costos pre-impuestos aplicados.</li>
                ) : (
                  data.pretax_charges.map((p) => (
                    <li key={p.id}>
                      {p.pre_tax_charge_nombre} — {p.porcentaje_snapshot}% {' — '}
                      <b>{formatUSD(p.monto_aplicado_snapshot)}</b>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h5>Impuestos</h5>
              <ul className="mb-0">
                {data.impuestos.length === 0 ? (
                  <li className="text-muted">Sin impuestos aplicados.</li>
                ) : (
                  data.impuestos.map((t) => (
                    <li key={t.id}>
                      {t.tax_nombre} — {t.porcentaje_snapshot}%
                      {t.monto_minimo_snapshot ? ` (mín ${formatUSD(t.monto_minimo_snapshot)})` : ''}
                      {' — '}
                      <b>{formatUSD(t.monto_aplicado_snapshot)}</b>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
