import React, { useEffect, useMemo, useRef, useState } from 'react'
import ErrorAlert from '../../components/global/ErrorAlert'
import PaginationBar from '../../components/global/PaginationBar'
import { fetchRevenuePayments, markPaymentPaid, type RevenuePaymentListItem } from '../../api/revenuePaymentsApi'
import { fetchClientsAll } from '../../api/clientsApi'
import type { Client } from '../../api/types/models'
import { formatUSD } from '../../utils/money'
import { formatDateAR } from '../../utils/date'
import { drfErrorToMessage } from '../../utils/drfErrorToMessage'
import type { PaginatedResponse } from '../../api/types'
import ConfirmModal from '../../components/global/ConfirmModal'
import SearchSelect from '../../components/global/SearchSelect'
import { useToast } from '../../hooks/useToast'

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}
function addMonths(base: Date, months: number): Date {
  const d = new Date(base)
  d.setMonth(d.getMonth() + months)
  return d
}


export default function PaymentsPage() {
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [cobrado, setCobrado] = useState<boolean>(false) // false=pendientes, true=cobrados
  const [clienteId, setClienteId] = useState<number | ''>('')
  const [metodoPago, setMetodoPago] = useState<string>('')
  const [tipo, setTipo] = useState<string>('')
  const [fechaDesde, setFechaDesde] = useState<string>(() => toISO(addDays(new Date(), -7)))
  const [fechaHasta, setFechaHasta] = useState<string>(() => toISO(addDays(new Date(), 7)))

  const [data, setData] = useState<PaginatedResponse<RevenuePaymentListItem> | null>(null)
  const totalPages = useMemo(() => (data ? Math.max(1, Math.ceil(data.count / pageSize)) : 1), [data, pageSize])

  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const toast = useToast()
  const loadSeq = useRef(0)

  async function load() {
    const seq = ++loadSeq.current
    try {
      setError(null)
      const res = await fetchRevenuePayments({
        page,
        pageSize,
        cobrado,
        clienteId: clienteId === '' ? undefined : Number(clienteId),
        metodoPago: metodoPago || undefined,
        tipo: tipo || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      })

      // Si hubo otro load después, ignoramos este resultado
      if (seq !== loadSeq.current) return

      setData(res)
    } catch (e: any) {
      if (seq !== loadSeq.current) return
      setError(e.response.data.error.message)
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const cs = await fetchClientsAll()
        setClients(cs)
      } catch {
        // ignore
      }
    })()
  }, [])

  useEffect(() => {
    load()
  }, [page, pageSize, cobrado, clienteId, metodoPago, tipo, fechaDesde, fechaHasta])

  async function onMarkPaidConfirmed() {
    if (!confirmId) return
    try {
      setConfirmLoading(true)
      setError(null)
      await markPaymentPaid(confirmId)
      setConfirmId(null)
      toast.success('Pago marcado como cobrado.')
      await load()
    } catch (e: any) {
      setError(e.response.data.error.message)
    } finally {
      setConfirmLoading(false)
    }
  }


  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h1 className="h3 mb-0">Pagos</h1>
          <div className="text-muted small">Pendientes / Cobrados</div>
        </div>
      </div>

      {error ? <ErrorAlert message={error} /> : null}

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            {/* FILA 1 */}
            <div className="col-12 col-md-3">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={String(cobrado)}
                onChange={(e) => {
                  setPage(1)
                  setCobrado(e.target.value === 'true')
                }}
              >
                <option value="false">Pendientes</option>
                <option value="true">Cobrados</option>
              </select>
            </div>

            <div className="col-12 col-md-5">
              <label className="form-label">Cliente</label>
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

            <div className="col-12 col-md-2">
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={tipo}
                onChange={(e) => {
                  setPage(1)
                  setTipo(e.target.value)
                }}
              >
                <option value="">— Todos —</option>
                <option value="VENTA">Venta</option>
                <option value="ALQUILER">Alquiler</option>
              </select>
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">Método</label>
              <select
                className="form-select"
                value={metodoPago}
                onChange={(e) => {
                  setPage(1)
                  setMetodoPago(e.target.value)
                }}
              >
                <option value="">— Todos —</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="TARJETA_CREDITO">Tarjeta crédito</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            {/* FILA 2 */}
            <div className="col-12 col-md-3">
              <label className="form-label">Desde</label>
              <input
                className="form-control"
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  setPage(1)
                  setFechaDesde(e.target.value)
                }}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Hasta</label>
              <input
                className="form-control"
                type="date"
                value={fechaHasta}
                onChange={(e) => {
                  setPage(1)
                  setFechaHasta(e.target.value)
                }}
              />
            </div>

            <div className="col-12 col-md-6 d-flex align-items-end">
              <div className="btn-group flex-wrap" role="group" aria-label="Rangos rápidos">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  type="button"
                  onClick={() => {
                    const t = new Date()
                    setPage(1)
                    setFechaDesde(toISO(addDays(t, -7)))
                    setFechaHasta(toISO(addDays(t, 7)))
                  }}
                >
                  ±1 semana
                </button>

                <button
                  className="btn btn-sm btn-outline-secondary"
                  type="button"
                  onClick={() => {
                    const t = new Date()
                    setPage(1)
                    setFechaDesde(toISO(addDays(t, -7)))
                    setFechaHasta(toISO(t))
                  }}
                >
                  Última semana
                </button>

                <button
                  className="btn btn-sm btn-outline-secondary"
                  type="button"
                  onClick={() => {
                    const t = new Date()
                    setPage(1)
                    setFechaDesde(toISO(addMonths(t, -1)))
                    setFechaHasta(toISO(t))
                  }}
                >
                  Último mes
                </button>

                <button
                  className="btn btn-sm btn-outline-secondary"
                  type="button"
                  onClick={() => {
                    const t = new Date()
                    setPage(1)
                    setFechaDesde(toISO(t))
                    setFechaHasta(toISO(addDays(t, 7)))
                  }}
                >
                  Próx. semana
                </button>

                <button
                  className="btn btn-sm btn-outline-secondary"
                  type="button"
                  onClick={() => {
                    const t = new Date()
                    setPage(1)
                    setFechaDesde(toISO(t))
                    setFechaHasta(toISO(addMonths(t, 1)))
                  }}
                >
                  Próx. mes
                </button>

                <button
                  className="btn btn-sm btn-outline-secondary"
                  type="button"
                  onClick={() => {
                    const t = new Date()
                    setPage(1)
                    setFechaDesde(toISO(t))
                    setFechaHasta(toISO(addMonths(t, 3)))
                  }}
                >
                  Próx. 3 meses
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!data ? (
        <div className="text-muted">Cargando...</div>
      ) : data.results.length === 0 ? (
        <div className="text-muted">Sin resultados.</div>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Fecha Prevista</th>
                <th>Fecha Pago Real</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Método</th>
                <th className="text-end">Monto</th>
                <th>Estado</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateAR(p.fecha_prevista)}</td>
                  <td>{p.fecha_cobro_real ? formatDateAR(p.fecha_cobro_real) : '-'}</td>
                  <td>{p.cliente?.nombre ?? '—'}</td>
                  <td>{p.revenue_event_tipo}</td>
                  <td>{p.metodo_pago}</td>
                  <td className="text-end">{formatUSD(p.monto)}</td>
                  <td>
                    {p.cobrado ? (
                      <span className="badge text-bg-success">Cobrado</span>
                    ) : (
                      <span className="badge text-bg-warning">Pendiente</span>
                    )}
                  </td>
                  <td className="text-end">
                    {!p.cobrado ? (
                      <button className="btn btn-sm btn-outline-success" onClick={() => setConfirmId(p.id)}>
                        Marcar cobrado
                      </button>
                    ) : (
                      <span className="text-muted small"> — </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <PaginationBar
            page={page}
            pageSize={pageSize}
            count={data.count}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPage(1)
              setPageSize(s)
            }}
          />

          <ConfirmModal
            show={confirmId !== null}
            title="Confirmar cobro"
            message="¿Querés marcar este pago como cobrado? Esta acción no se puede deshacer."
            confirmText="Sí, marcar cobrado"
            cancelText="Cancelar"
            confirmVariant="success"
            confirmDisabled={confirmLoading}
            cancelDisabled={confirmLoading}
            onCancel={() => setConfirmId(null)}
            onConfirm={onMarkPaidConfirmed}
          />

        </div>
      )}
    </div>
  )
}
