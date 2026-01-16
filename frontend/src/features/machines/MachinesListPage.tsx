import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { FaPencilAlt, FaTrash } from 'react-icons/fa'
import type { MachineBase } from '../../api/types'
import { fetchMachines, eliminarMachine } from '../../api/machinesApi'

import PaginationBar from '../../components/global/PaginationBar'
import FlashAlert from '../../components/global/FlashAlert'
import ErrorAlert from '../../components/global/ErrorAlert'
import ConfirmModal from '../../components/global/ConfirmModal'
import { useFlashFromLocation } from '../../hooks/useFlashFromLocation'
import { drfErrorToMessage } from '../../utils/drfErrorToMessage'
import { formatUSD } from '../../utils/money'

const PAGE_SIZES = [10, 20, 50]

const MachinesListPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const from = location.pathname + location.search

  const { flash, clearFlash } = useFlashFromLocation()

  const [items, setItems] = useState<MachineBase[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(() => Number(searchParams.get('page') ?? 1))
  const [pageSize, setPageSize] = useState(() => Number(searchParams.get('pageSize') ?? 10))

  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  const [qApplied, setQApplied] = useState(() => searchParams.get('q') ?? '')

  const didInitQ = useRef(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [confirmId, setConfirmId] = useState<number | null>(null)

  const pages = useMemo(() => Math.max(1, Math.ceil(count / Math.max(1, pageSize))), [count, pageSize])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchMachines({ page, pageSize, q: qApplied || undefined })
      setItems(res.results)
      setCount(res.count)

      const newPages = Math.max(1, Math.ceil(res.count / Math.max(1, pageSize)))
      if (page > newPages) setPage(newPages)
    } catch (e: any) {
      setError(e.response.data.error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!didInitQ.current) {
      didInitQ.current = true
      return
    }

    const t = setTimeout(() => {
      setQApplied(q.trim())
      setPage(1)
    }, 300)

    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const next: Record<string, string> = {}

    if (page !== 1) next.page = String(page)
    if (pageSize !== 10) next.pageSize = String(pageSize)
    if (qApplied) next.q = qApplied

    setSearchParams(next, { replace: true })
  }, [page, pageSize, qApplied, setSearchParams])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, qApplied])

  const onDelete = async (id: number) => {
    setConfirmId(null)
    setLoading(true)
    setError(null)
    try {
      await eliminarMachine(id)
      navigate(from, {
        state: { flash: { type: 'success', message: 'Item Base eliminada.' } }
      })
      await load()
    } catch (e: any) {
      setError(e.response.data.error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h2 className="mb-1">Items Base</h2>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <input
            className="form-control form-control-sm"
            style={{ width: 260 }}
            placeholder="Buscar por nombre..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Link to="/machines/nuevo" state={{ from }} className="btn btn-primary rounded-pill">
            + Nuevo
          </Link>
        </div>
      </div>

      <FlashAlert flash={flash} onClose={clearFlash} />
      {error && <ErrorAlert message={error} />}

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Total</th>
              <th style={{ width: 220 }} className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="text-muted">Cargando...</td>
              </tr>
            )}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted">Sin datos.</td>
              </tr>
            )}

            {!loading &&
              items.map((it) => (
                <tr key={it.id}>
                  <td className="fw-semibold">{it.nombre}</td>
                  <td>{formatUSD(it.total)}</td>
                  <td className="text-end">
                    <Link
                      to={`/machines/${it.id}/editar`}
                      state={{ from }}
                      className="btn btn-sm btn-outline-secondary rounded-pill btn-icon me-2"
                      title="Editar"
                      aria-label="Editar"
                    >
                      <FaPencilAlt />
                    </Link>

                    <button
                      className="btn btn-sm btn-outline-danger rounded-pill btn-icon"
                      onClick={() => setConfirmId(it.id)}
                      title="Eliminar"
                      aria-label="Eliminar"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <PaginationBar
        page={page}
        pageSize={pageSize}
        count={count}
        pageSizes={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s)
          setPage(1)
        }}
      />

      <ConfirmModal
        show={confirmId !== null}
        title="Eliminar machine"
        message="¿Seguro que querés eliminar este registro?"
        confirmText="Eliminar"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => confirmId && onDelete(confirmId)}
      />
    </div>
  )
}

export default MachinesListPage
