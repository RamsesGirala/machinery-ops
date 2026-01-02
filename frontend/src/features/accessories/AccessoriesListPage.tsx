import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import type { Accessory } from '../../api/types'
import { fetchAccessories, eliminarAccessory } from '../../api/accessoriesApi'

import PaginationBar from '../../components/global/PaginationBar'
import FlashAlert from '../../components/global/FlashAlert'
import ErrorAlert from '../../components/global/ErrorAlert'
import ConfirmModal from '../../components/global/ConfirmModal'
import { useFlashFromLocation } from '../../hooks/useFlashFromLocation'
import { drfErrorToMessage } from '../../utils/drfErrorToMessage'

const PAGE_SIZES = [10, 20, 50]

const AccessoriesListPage: React.FC = () => {
  const navigate = useNavigate()
  const { flash, clearFlash } = useFlashFromLocation()

  const [items, setItems] = useState<Accessory[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [confirmId, setConfirmId] = useState<number | null>(null)
  const pages = useMemo(() => Math.max(1, Math.ceil(count / Math.max(1, pageSize))), [count, pageSize])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchAccessories({ page, pageSize })
      setItems(res.results)
      setCount(res.count)
      if (page > pages) setPage(pages)
    } catch (e: any) {
      setError(drfErrorToMessage(e, 'No se pudieron cargar los accessories.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize])

  const onDelete = async (id: number) => {
    setConfirmId(null)
    setLoading(true)
    setError(null)
    try {
      await eliminarAccessory(id)
      navigate('/accessories', { state: { flash: { type: 'success', message: 'Accessory eliminado.' } } })
      await load()
    } catch (e: any) {
      setError(drfErrorToMessage(e, 'No se pudo eliminar.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h2 className="mb-1">Accessories</h2>
        </div>

        <Link to="/accessories/nuevo" className="btn btn-primary rounded-pill">
          + Nuevo
        </Link>
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
                  <td>{it.total}</td>
                  <td className="text-end">
                    <Link to={`/accessories/${it.id}/editar`} className="btn btn-sm btn-outline-secondary rounded-pill me-2">
                      Editar
                    </Link>
                    <button className="btn btn-sm btn-outline-danger rounded-pill" onClick={() => setConfirmId(it.id)}>
                      Eliminar
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
        title="Eliminar accessory"
        message="¿Seguro que querés eliminar este registro?"
        confirmText="Eliminar"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => confirmId && onDelete(confirmId)}
      />
    </div>
  )
}

export default AccessoriesListPage
