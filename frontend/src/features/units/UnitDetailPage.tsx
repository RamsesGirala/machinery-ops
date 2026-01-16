import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchPurchasedUnit } from '../../api/purchasedUnitsApi'
import type { PurchasedUnitDetail, RevenueEventForUnit } from '../../api/types/models'
import ErrorAlert from '../../components/global/ErrorAlert'

import UnitLifecycleModal from '../../components/units/UnitLifecycleModal'
import { useUnitLifecycleModal } from '../../hooks/useUnitLifecycleModal'
import { formatUSD } from '../../utils/money'
import { formatDateAR } from '../../utils/date'
import { useReturnTo } from '../../hooks/useReturnTo'

export default function UnitDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const lifecycle = useUnitLifecycleModal()
  const { goBack } = useReturnTo('/units')
  const [data, setData] = useState<PurchasedUnitDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadUnit() {
    if (!id) return
    try {
      setError(null)
      const res = await fetchPurchasedUnit(Number(id))
      setData(res)
    } catch (e: any){
      setError(e.response.data.error.message)
    }
  }

  useEffect(() => {
    loadUnit()
  }, [id])

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h1 className="h3 mb-0">Unidad</h1>
          <div className="text-muted small">Detalle</div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={goBack}>
            Volver
          </button>

          {data?.estado === 'DEPOSITO' ? (
            <>
              <button className="btn btn-outline-primary" onClick={() => lifecycle.open('rent', data)}>
                Alquilar
              </button>
              <button className="btn btn-outline-danger" onClick={() => lifecycle.open('sell', data)}>
                Vender
              </button>
            </>
          ) : null}

          {data?.estado === 'ALQUILADA' ? (
            <button className="btn btn-outline-success" onClick={() => lifecycle.open('finish', data)}>
              Finalizar alquiler
            </button>
          ) : null}
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      {!data ? (
        <div className="text-muted">Cargando...</div>
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-12 col-md-3">
                <div className="text-muted small">ID</div>
                <div className="fw-semibold">#{data.id}</div>
              </div>

              <div className="col-12 col-md-3">
                <div className="text-muted small">Identificador</div>
                <div className="fw-semibold">{data.identificador || '—'}</div>
              </div>

              <div className="col-12 col-md-3">
                <div className="text-muted small">Item</div>
                <div className="fw-semibold">{data.machine_nombre}</div>
              </div>

              <div className="col-12 col-md-3">
                <div className="text-muted small">Estado</div>
                <div className="fw-semibold">{data.estado}</div>
              </div>

              <div className="col-12 col-md-3">
                <div className="text-muted small">Fecha compra</div>
                <div className="fw-semibold">{formatDateAR(data.fecha_compra)}</div>
              </div>

              <div className="col-12 col-md-3">
                <div className="text-muted small">Costo compra</div>
                <div className="fw-semibold">{formatUSD(data.total_compra)}</div>
              </div>

              <div className="col-12">
                <hr />
              </div>

              <div className="col-12 col-md-6">
                <h2 className="h6 mb-2">Accesorios comprados</h2>

                {data.accesorios.length === 0 ? (
                  <div className="text-muted">Sin accesorios.</div>
                ) : (
                  <ul className="mb-0">
                    {data.accesorios.map((a) => (
                      <li key={a.id}>
                        {a.accessory_nombre} x {a.cantidad} — {formatUSD(a.accessory_total_snapshot)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="col-12 col-md-6">
                <h2 className="h6 mb-2">Venta</h2>
                {!data.venta ? (
                  <div className="text-muted">No hay venta registrada.</div>
                ) : (
                  <div className="border rounded p-3">
                    <div className="d-flex flex-wrap gap-3">
                      <div>
                        <div className="text-muted small">Fecha</div>
                        <div className="fw-semibold">{formatDateAR(data.venta.fecha_operacion) }</div>
                      </div>
                      <div>
                        <div className="text-muted small">Total</div>
                        <div className="fw-semibold">{formatUSD(data.venta.monto_total_final)}</div>
                      </div>
                      <div>
                        <div className="text-muted small">Cliente</div>
                        <div className="fw-semibold">{data.venta.cliente?.nombre ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted small">Pagos</div>
                        <div className="fw-semibold">
                          Pendientes: {data.venta.pagos_pendientes} · Cobrados: {data.venta.pagos_cobrados}
                        </div>
                      </div>
                    </div>
                    {data.venta.notas ? <div className="text-muted small mt-2">{data.venta.notas}</div> : null}
                  </div>
                )}
              </div>

              <div className="col-12">
                <hr />
              </div>

              <div className="col-12">
                <h2 className="h6 mb-2">Historial de alquileres</h2>

                {data.alquileres.length === 0 ? (
                  <div className="text-muted">Sin alquileres.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>Inicio</th>
                          <th>Fin est.</th>
                          <th>Fin real</th>
                          <th>Tipo</th>
                          <th className="text-end">Unitario</th>
                          <th className="text-end">Total</th>
                          <th className="text-end">Pagos Pendientes / Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.alquileres.map((a) => {
                          const activo = !a.retorno_real_year || !a.retorno_real_month
                          return (
                            <tr key={a.id}>
                              <td>{formatDateAR(a.rental_inicio)}</td>
                              <td>{formatDateAR(a.rental_fin_estimado)}</td>
                              <td>{formatDateAR(a.rental_fin_real)}</td>
                              <td>{a.rental_tipo ?? '—'}</td>
                              <td className="text-end">{formatUSD(a.monto_unitario)}</td>
                              <td className="text-end">{formatUSD(a.monto_total_final)}</td>
                              <td className="text-end">{a.pagos_pendientes} / {a.pagos_pendientes + a.pagos_cobrados}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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
