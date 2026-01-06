import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchBudgets, deleteBudget, markBudgetPurchased, type BudgetsListFilters } from '../../api/budgetsApi'
import { fetchClientsAll } from '../../api/clientsApi'
import type { Budget, Client} from '../../api/types/models'
import PaginationBar from '../../components/global/PaginationBar'
import ErrorAlert from '../../components/global/ErrorAlert'
import ConfirmModal from '../../components/global/ConfirmModal'
import SearchSelect from '../../components/global/SearchSelect'
import { formatUSD } from '../../utils/money'
import { formatDateAR } from '../../utils/date'
import { budgetEstadoBadgeClass } from '../../utils/bagdes'
import { useToast } from '../../hooks/useToast'

export default function BudgetsListPage() {
  const nav = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const from = location.pathname + location.search
  const [items, setItems] = useState<Budget[]>([])
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState<number>(() => Number(searchParams.get('page') ?? 1))
  const [pageSize, setPageSize] = useState<number>(() => Number(searchParams.get('pageSize') ?? 10))
  const [count, setCount] = useState<number>(0)

  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [confirmPurchasedId, setConfirmPurchasedId] = useState<number | null>(null)
  const [confirmPurchasedLoading, setConfirmPurchasedLoading] = useState(false)

  const toast = useToast()

  // filtros
  const [fechaDesde, setFechaDesde] = useState<string>(() => searchParams.get('fechaDesde') ?? '')
  const [fechaHasta, setFechaHasta] = useState<string>(() => searchParams.get('fechaHasta') ?? '')
  const [estado, setEstado] = useState<string>(() => searchParams.get('estado') ?? '') // '' = todos
  const [clients, setClients] = useState<Client[]>([])
  const [clienteId, setClienteId] = useState<string>(() => searchParams.get('clienteId') ?? '')

  const filters: BudgetsListFilters = useMemo(
    () => ({
      page,
      pageSize,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      estado: estado || undefined,
      clienteId: clienteId ? Number(clienteId) : undefined,
    }),
    [page, pageSize, fechaDesde, fechaHasta, estado, clienteId]
  )

  useEffect(() => {
    const next: Record<string, string> = {}

    if (page !== 1) next.page = String(page)
    if (pageSize !== 10) next.pageSize = String(pageSize)
    if (fechaDesde) next.fechaDesde = fechaDesde
    if (fechaHasta) next.fechaHasta = fechaHasta
    if (estado) next.estado = estado
    if (clienteId) next.clienteId = String(clienteId)

    setSearchParams(next, { replace: true })
  }, [page, pageSize, fechaDesde, fechaHasta, estado, clienteId, setSearchParams])


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
    ;(async () => {
      try {
        const cs = await fetchClientsAll()
        setClients(cs)
      } catch {
        // no cortamos la pantalla si falla el catálogo
        setClients([])
      }
    })()
  }, [])

  useEffect(() => {
    load()
  }, [filters])

  async function onDelete(id: number) {
    try {
      await deleteBudget(id)
      setConfirmId(null)
      await load()
    } catch(e: any){
      setError(e.response.data.error.message)
    }
  }

  async function onMarkPurchasedConfirmed() {
    if (!confirmPurchasedId) return

    try {
      setConfirmPurchasedLoading(true)
      setError(null)
      await markBudgetPurchased(confirmPurchasedId)
      setConfirmPurchasedId(null)
      toast.success('Presupuesto marcado como comprado.')
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? 'No se pudo marcar como comprado.')
    } finally {
      setConfirmPurchasedLoading(false)
    }
  }


  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h1 className="h3 mb-0">Presupuestos</h1>
        </div>

        <button className="btn btn-primary" onClick={() => nav('/budgets/nuevo', { state: { from } })}>
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
              <label className="form-label small text-muted mb-1">Cliente</label>
              <SearchSelect
                value={clienteId}
                placeholder="Buscar cliente..."
                emptyLabel="— Todos —"
                options={clients.map((c) => ({ value: c.id, label: c.nombre }))}
                onChange={(v) => {
                  setPage(1)
                  setClienteId(v ? Number(v) : '')
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
                setClienteId('')
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
                <th>Cliente</th>
                <th>Maquinas</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted">
                    Sin datos.
                  </td>
                </tr>
              ) : (
                items.map((b) => (
                  <tr key={b.id}>
                    <td>{b.numero}</td>
                    <td>{b.cliente?.nombre ?? '-'}</td>
                    <td>
                      {b.machine_bases?.length ? (
                        <ul className="mb-0 ps-3">
                          {b.machine_bases.map((name, idx) => (
                            <li key={idx}>{name}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>{formatDateAR(b.fecha)}</td>
                    <td>{formatUSD(b.total_snapshot)}</td>
                    <td>
                      <span className={`badge ${budgetEstadoBadgeClass(b.estado)}`}>
                        {b.estado}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => nav(`/budgets/${b.id}`, { state: { from } })}
                      >
                        Ver
                      </button>

                    {b.estado === 'DRAFT' ? (
                      <>
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => nav(`/budgets/${b.id}/editar`, { state: { from } })}
                        >
                          Editar
                        </button>

                        <button
                          className="btn btn-sm btn-outline-success me-2"
                          onClick={() => setConfirmPurchasedId(b.id)}
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
      <ConfirmModal
        show={confirmPurchasedId !== null}
        title="Confirmar compra"
        message="¿Querés marcar este presupuesto como comprado? Esta acción no se puede deshacer."
        confirmText="Sí, marcar comprado"
        cancelText="Cancelar"
        confirmVariant="success"
        confirmDisabled={confirmPurchasedLoading}
        cancelDisabled={confirmPurchasedLoading}
        onCancel={() => setConfirmPurchasedId(null)}
        onConfirm={onMarkPurchasedConfirmed}
      />

    </div>
  )
}
