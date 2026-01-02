import React from 'react'

type Props = {
  page: number
  pageSize: number
  count: number
  pageSizes?: number[]
  onPageChange: (p: number) => void
  onPageSizeChange?: (s: number) => void
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

const PaginationBar: React.FC<Props> = ({
  page,
  pageSize,
  count,
  pageSizes = [10, 20, 50],
  onPageChange,
  onPageSizeChange
}) => {
  const pages = Math.max(1, Math.ceil(count / Math.max(1, pageSize)))

  const canPrev = page > 1
  const canNext = page < pages

  const goto = (p: number) => onPageChange(clamp(p, 1, pages))

  // ventana de páginas
  const windowSize = 7
  const half = Math.floor(windowSize / 2)
  let start = Math.max(1, page - half)
  let end = Math.min(pages, start + windowSize - 1)
  start = Math.max(1, end - windowSize + 1)

  const items: number[] = []
  for (let i = start; i <= end; i++) items.push(i)

  return (
    <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
      <div className="small text-muted">
        Total: <span className="fw-semibold">{count}</span> · Página{' '}
        <span className="fw-semibold">{page}</span> / <span className="fw-semibold">{pages}</span>
      </div>

      <div className="d-flex flex-wrap gap-2 align-items-center">
        {onPageSizeChange && (
          <select
            className="form-select form-select-sm"
            style={{ width: 110 }}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizes.map((s) => (
              <option key={s} value={s}>
                {s}/pág
              </option>
            ))}
          </select>
        )}

        <div className="btn-group" role="group" aria-label="Pagination">
          <button className="btn btn-sm btn-outline-secondary" disabled={!canPrev} onClick={() => goto(1)}>
            «
          </button>
          <button className="btn btn-sm btn-outline-secondary" disabled={!canPrev} onClick={() => goto(page - 1)}>
            ‹
          </button>

          {start > 1 && (
            <button className="btn btn-sm btn-outline-secondary" onClick={() => goto(1)}>
              1
            </button>
          )}
          {start > 2 && <button className="btn btn-sm btn-outline-secondary" disabled>…</button>}

          {items.map((p) => (
            <button
              key={p}
              className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => goto(p)}
            >
              {p}
            </button>
          ))}

          {end < pages - 1 && <button className="btn btn-sm btn-outline-secondary" disabled>…</button>}
          {end < pages && (
            <button className="btn btn-sm btn-outline-secondary" onClick={() => goto(pages)}>
              {pages}
            </button>
          )}

          <button className="btn btn-sm btn-outline-secondary" disabled={!canNext} onClick={() => goto(page + 1)}>
            ›
          </button>
          <button className="btn btn-sm btn-outline-secondary" disabled={!canNext} onClick={() => goto(pages)}>
            »
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaginationBar
