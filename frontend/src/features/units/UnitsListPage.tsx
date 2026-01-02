import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPurchasedUnits, type UnitsListFilters } from '../../api/purchasedUnitsApi'
import type { PurchasedUnit } from '../../api/types/models'
import PaginationBar from '../../components/global/PaginationBar'
import ErrorAlert from '../../components/global/ErrorAlert'

import UnitLifecycleModal from '../../components/units/UnitLifecycleModal'
import { useUnitLifecycleModal } from '../../hooks/useUnitLifecycleModal'

export default function UnitsListPage() {
  const nav = useNavigate()
  const lifecycle = useUnitLifecycleModal()

  const [items, setItems] = useState<PurchasedUnit[]>([])
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [count, setCount] = useState<number>(0)

  const [estado, setEstado] = useState<string>('') // '' = todos
  const [fechaDesde, setFechaDesde] = useState<string>('')
  const [fechaHasta, setFechaHasta] = useState<string>('')

  const filters: UnitsListFilters = useMemo(
    () => ({
      page,
      pageSize,
      estado: estado || undefined,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
    }),
    [page, pageSize, estado, fechaDesde, fechaHasta]
  )

  async function load() {
    try {
      setError(null)
      const res = await fetchPurchasedUnits(filters)
      setItems(res.results)
      setCount(res.count)
    } catch {
      setError('No se pudieron cargar las unidades.')
      setItems([])
      setCount(0)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h1 className="h3 mb-0">Unidades compradas</h1>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label small text-muted mb-1">Estado</label>
              <select
                className="form-select"
                value={estado}
                onChange={(e) => {
                  setPage(1)
                  setEstado(e.target.value)
                }}
              >
                <option value="">Todos</option>
                <option value="DEPOSITO">Depósito</option>
                <option value="ALQUILADA">Alquilada</option>
                <option value="VENDIDA">Vendida</option>
              </select>
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label small text-muted mb-1">Fecha compra desde</label>
              <input
                type="date"
                className="form-control"
                value={fechaDesde}
                onChange={(e) => {
                  setPage(1)
                  setFechaDesde(e.target.value)
                }}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label small text-muted mb-1">Fecha compra hasta</label>
              <input
                type="date"
                className="form-control"
                value={fechaHasta}
                onChange={(e) => {
                  setPage(1)
                  setFechaHasta(e.target.value)
                }}
              />
            </div>

            <div className="col-12 col-md-3">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setPage(1)
                  setEstado('')
                  setFechaDesde('')
                  setFechaHasta('')
                }}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Máquina</th>
                <th>Estado</th>
                <th>Fecha compra</th>
                <th>Presupuesto</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted">
                    Sin datos.
                  </td>
                </tr>
              ) : (
                items.map((u) => (
                  <tr key={u.id}>
                    <td>{u.machine_nombre}</td>
                    <td>
                      <span className="badge bg-secondary">{u.estado}</span>
                    </td>
                    <td>{u.fecha_compra}</td>
                    <td className="text-muted">{u.budget_numero}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => nav(`/units/${u.id}`)}>
                        Ver
                      </button>

                      {u.estado === 'DEPOSITO' ? (
                        <>
                          <button
                            className="btn btn-sm btn-outline-primary me-2"
                            onClick={() => lifecycle.open('rent', u)}
                          >
                            Alquilar
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => lifecycle.open('sell', u)}>
                            Vender
                          </button>
                        </>
                      ) : null}

                      {u.estado === 'ALQUILADA' ? (
                        <button className="btn btn-sm btn-outline-success" onClick={() => lifecycle.open('finish', u)}>
                          Finalizar alquiler
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <PaginationBar
            page={page}
            pageSize={pageSize}
            count={count}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s)
              setPage(1)
            }}
          />
        </div>
      </div>

      {/* Modal */}
      <UnitLifecycleModal
        show={lifecycle.show}
        mode={lifecycle.mode}
        unit={lifecycle.unit}
        onClose={lifecycle.close}
        onSuccess={load}
      />
    </div>
  )
}
