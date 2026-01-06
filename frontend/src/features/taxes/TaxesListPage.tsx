import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { FaPencilAlt, FaTrash } from 'react-icons/fa'

import type { Tax } from '../../api/types'
import { fetchTaxes, eliminarTax } from '../../api/taxesApi'
import PaginationBar from '../../components/global/PaginationBar'
import FlashAlert from '../../components/global/FlashAlert'
import ErrorAlert from '../../components/global/ErrorAlert'
import ConfirmModal from '../../components/global/ConfirmModal'
import { useFlashFromLocation } from '../../hooks/useFlashFromLocation'
import { formatUSD } from '../../utils/money'

const PAGE_SIZES = [10, 20, 50]

const TaxesListPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const from = location.pathname + location.search

  const { flash, clearFlash } = useFlashFromLocation()

  const [items, setItems] = useState<Tax[]>([])
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
      const res = await fetchTaxes({ page, pageSize, q: qApplied || undefined })
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
      await eliminarTax(id)
      navigate(from, { state: { flash: { type: 'success', message: 'Impuesto eliminado.' } } })
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
          <h2 className="mb-1">Impuestos</h2>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <input
            className="form-control form-control-sm"
            style={{ width: 260 }}
            placeholder="Buscar por nombre..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Link to="/taxes/nuevo" state={{ from }} className="btn btn-primary rounded-pill">
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
              <th>Porcentaje</th>
              <th>Minimo</th>
              <th>Siempre incluir</th>
              <th>Imprime</th>
              <th style={{ width: 220 }} className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="text-muted">Cargando...</td>
              </tr>
            )}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted">Sin datos.</td>
              </tr>
            )}

            {!loading &&
              items.map((it) => (
                <tr key={it.id}>
                  <td className="fw-semibold">{it.nombre}</td>
                  <td>{it.porcentaje}%</td>
                  <td>{(it.monto_minimo === null) ? '-' : formatUSD(it.monto_minimo)}</td>
                  <td>{it.siempre_incluir ? 'Sí' : 'No'}</td>
                  <td>{it.se_imprime_en_presupuesto  ? 'Sí' : 'No'}</td>
                  <td className="text-end">
                    <Link to={`/taxes/${it.id}/editar`}  title="Editar"
                      aria-label="Editar" state={{ from }} className="btn btn-sm btn-outline-secondary rounded-pill me-2">
                      <FaPencilAlt />
                    </Link>
                    <button className="btn btn-sm btn-outline-danger rounded-pill" title="Eliminar"
                      aria-label="Eliminar" onClick={() => setConfirmId(it.id)}>
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
        title="Eliminar tax"
        message="¿Seguro que querés eliminar este registro?"
        confirmText="Eliminar"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => confirmId && onDelete(confirmId)}
      />
    </div>
  )
}

export default TaxesListPage
