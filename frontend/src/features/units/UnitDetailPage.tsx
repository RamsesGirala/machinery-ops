import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchPurchasedUnit } from '../../api/purchasedUnitsApi'
import type { PurchasedUnitDetail } from '../../api/types/models'
import ErrorAlert from '../../components/global/ErrorAlert'

import UnitLifecycleModal from '../../components/units/UnitLifecycleModal'
import { useUnitLifecycleModal } from '../../hooks/useUnitLifecycleModal'

export default function UnitDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const lifecycle = useUnitLifecycleModal()

  const [data, setData] = useState<PurchasedUnitDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadUnit() {
    try {
      setError(null)
      const u = await fetchPurchasedUnit(Number(id))
      setData(u)
    } catch {
      setError('No se pudo cargar la unidad.')
      setData(null)
    }
  }

  useEffect(() => {
    loadUnit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h1 className="h3 mb-0">Unidad</h1>
          <div className="text-muted small">{data ? `${data.machine_nombre} — ${data.estado}` : ''}</div>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => nav(-1)}>
          Volver
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      {!data ? null : (
        <div className="card">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="text-muted small">Máquina</div>
                <div className="fw-semibold">{data.machine_nombre}</div>
              </div>

              <div className="col-12 col-md-3">
                <div className="text-muted small">Estado</div>
                <div className="fw-semibold">{data.estado}</div>
              </div>

              <div className="col-12 col-md-3">
                <div className="text-muted small">Fecha compra</div>
                <div className="fw-semibold">{data.fecha_compra}</div>
              </div>

              <div className="col-12">
                <hr />
              </div>

              <div className="col-12">
                <h2 className="h6 mb-2">Accesorios comprados</h2>

                {data.accesorios.length === 0 ? (
                  <div className="text-muted">Sin accesorios.</div>
                ) : (
                  <ul className="mb-0">
                    {data.accesorios.map((a) => (
                      <li key={a.id}>
                        {a.accessory_nombre} x {a.cantidad} — USD {a.accessory_total_snapshot}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="col-12">
                <hr />
              </div>

              <div className="col-12 col-md-6">
                <div className="text-muted small">Presupuesto origen</div>
                <div className="fw-semibold">{data.budget_numero}</div>
              </div>

              <div className="col-12 col-md-6">
                <div className="text-muted small">Total compra (snapshot)</div>
                <div className="fw-semibold">USD {data.total_compra}</div>
              </div>

              {data.notas_compra ? (
                <div className="col-12">
                  <div className="text-muted small">Notas</div>
                  <div>{data.notas_compra}</div>
                </div>
              ) : null}

              <div className="col-12">
                <hr />
              </div>

              {/* Acciones (botones) */}
              <div className="col-12">
                {data.estado === 'DEPOSITO' ? (
                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-outline-primary" onClick={() => lifecycle.open('rent', data)}>
                      Marcar alquilada
                    </button>
                    <button className="btn btn-outline-danger" onClick={() => lifecycle.open('sell', data)}>
                      Marcar vendida
                    </button>
                  </div>
                ) : null}

                {data.estado === 'ALQUILADA' ? (
                  <button className="btn btn-outline-success" onClick={() => lifecycle.open('finish', data)}>
                    Finalizar alquiler
                  </button>
                ) : null}

                {data.estado === 'VENDIDA' ? <div className="text-muted">Esta unidad ya está vendida.</div> : null}
              </div>
            
            
            
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <UnitLifecycleModal
        show={lifecycle.show}
        mode={lifecycle.mode}
        unit={lifecycle.unit}
        onClose={lifecycle.close}
        onSuccess={loadUnit}
      />
    </div>
  )
}
