import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchBudgets, deleteBudget, markBudgetPurchased, type BudgetsListFilters } from '../../api/budgetsApi'
import type { Budget } from '../../api/types/models'
import PaginationBar from '../../components/global/PaginationBar'
import ErrorAlert from '../../components/global/ErrorAlert'
import ConfirmModal from '../../components/global/ConfirmModal'

export default function BudgetsListPage() {
  const nav = useNavigate()

  const [items, setItems] = useState<Budget[]>([])
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [count, setCount] = useState<number>(0)

  const [confirmId, setConfirmId] = useState<number | null>(null)

  // filtros
  const [fechaDesde, setFechaDesde] = useState<string>('')
  const [fechaHasta, setFechaHasta] = useState<string>('')
  const [estado, setEstado] = useState<string>('') // '' = todos

  const filters: BudgetsListFilters = useMemo(
    () => ({
      page,
      pageSize,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      estado: estado || undefined,
    }),
    [page, pageSize, fechaDesde, fechaHasta, estado]
  )

  async function load() {
    try {
      setError(null)
      const res = await fetchBudgets(filters)
      setItems(res.results)
      setCount(res.count)
    } catch (e: any) {
      setError('No se pudieron cargar los presupuestos.')
      setItems([])
      setCount(0)
    }
  }

  useEffect(() => {
    load()
  }, [filters])

  async function onDelete(id: number) {
    try {
      await deleteBudget(id)
      setConfirmId(null)
      await load()
    } catch {
      setError('No se pudo eliminar el presupuesto.')
    }
  }

  async function onMarkPurchased(id: number) {
    try {
      setError(null)
      await markBudgetPurchased(id)
      await load()
    } catch {
      setError('No se pudo marcar como comprado.')
    }
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h1 className="h3 mb-0">Presupuestos</h1>
        </div>

        <button className="btn btn-primary" onClick={() => nav('/budgets/nuevo')}>
          + Nuevo
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label small text-muted mb-1">Fecha desde</label>
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
              <label className="form-label small text-muted mb-1">Fecha hasta</label>
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
                <option value="DRAFT">Draft</option>
                <option value="CERRADO">Cerrado</option>
              </select>
            </div>
          </div>

          <div className="mt-2">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setPage(1)
                setFechaDesde('')
                setFechaHasta('')
                setEstado('')
              }}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Número</th>
                <th>Máquinas</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
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
                items.map((b) => (
                  <tr key={b.id}>
                    <td>{b.numero}</td>
                    <td>{b.machine_nombres}</td>
                    <td>{b.fecha}</td>
                    <td>USD {b.total_snapshot}</td>
                    <td>
                      <span className={`badge ${b.estado === 'CERRADO' ? 'bg-success' : 'bg-secondary'}`}>
                        {b.estado}
                      </span>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => nav(`/budgets/${b.id}`)}>
                        Ver
                      </button>

                    {b.estado === 'DRAFT' ? (
                      <>
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => nav(`/budgets/${b.id}/editar`)}
                        >
                          Editar
                        </button>

                        <button
                          className="btn btn-sm btn-outline-success me-2"
                          onClick={() => onMarkPurchased(b.id)}
                        >
                          Marcar comprado
                        </button>

                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setConfirmId(b.id)}
                        >
                          Eliminar
                        </button>
                      </>
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

      <ConfirmModal
        show={confirmId !== null}
        title="Eliminar presupuesto"
        message="¿Seguro que querés eliminar este presupuesto?"
        confirmText="Eliminar"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => confirmId !== null && onDelete(confirmId)}
      />
    </div>
  )
}
