import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchBudget } from '../../api/budgetsApi'
import type { BudgetDetail } from '../../api/types/models'
import ErrorAlert from '../../components/global/ErrorAlert'
import { formatUSD } from '../../utils/money'

export default function BudgetDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const budgetId = Number(id)

  const [data, setData] = useState<BudgetDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

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
          <div className="text-muted">{data ? `${data.numero} · ${data.fecha}` : 'Cargando...'}</div>
        </div>

        <button className="btn btn-outline-secondary" onClick={() => nav('/budgets')}>
          Volver
        </button>
      </div>

      {error && <ErrorAlert message={error} />}
      {!data ? null : (
        <>
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <div className="card"><div className="card-body">
                <div className="text-muted">Base imponible</div>
                <div className="fs-4">{formatUSD(data.base_imponible_snapshot)}</div>
              </div></div>
            </div>
            <div className="col-md-4">
              <div className="card"><div className="card-body">
                <div className="text-muted">Impuestos</div>
                <div className="fs-4">{formatUSD(data.total_impuestos_snapshot)}</div>
              </div></div>
            </div>
            <div className="col-md-4">
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
