import React, { useEffect, useMemo, useRef, useState } from 'react'

export type SearchSelectOption = {
  value: string | number
  label: string
}

type Props = {
  value: string | number | '' | null
  options: SearchSelectOption[]
  placeholder?: string
  emptyLabel?: string
  onChange: (v: string | number | '' | null) => void
  className?: string
  size?: 'sm' | 'md'
  disabled?: boolean
  menuMaxHeight?: number
}

export default function SearchSelect({
  value,
  options,
  placeholder = 'Buscar...',
  emptyLabel = '— Seleccionar —',
  onChange,
  className,
  size = 'md',
  disabled,
  menuMaxHeight = 320,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState<number>(-1) // -1 => emptyLabel
  const rootRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const selectedLabel = useMemo(() => {
    if (value === '' || value === null || value === undefined) return ''
    return options.find((o) => String(o.value) === String(value))?.label ?? ''
  }, [value, options])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const inputClass = size === 'sm' ? 'form-control form-control-sm' : 'form-control'

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // si cambia el value desde afuera, limpio búsqueda
  useEffect(() => {
    setQuery('')
    setActiveIndex(-1)
  }, [value])

  // autoscroll al item activo
  useEffect(() => {
    if (!open || !menuRef.current) return
    const el = menuRef.current.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  function commitSelection(idx: number) {
    if (idx === -1) {
      onChange('')
      setOpen(false)
      return
    }
    const opt = filtered[idx]
    if (!opt) return
    onChange(opt.value)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      setActiveIndex((prev) => {
        const max = filtered.length - 1
        if (prev < max) return prev + 1
        return prev
      })
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) setOpen(true)
      setActiveIndex((prev) => {
        if (prev === -1) return -1
        return prev - 1
      })
      return
    }

    if (e.key === 'Enter') {
      if (!open) return
      e.preventDefault()
      commitSelection(activeIndex)
    }
  }

  return (
    <div ref={rootRef} className={`position-relative ${className ?? ''}`}>
      <input
        disabled={disabled}
        className={inputClass}
        value={query.length ? query : selectedLabel}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true)
          setActiveIndex(-1)
        }}
        onChange={(e) => {
          setOpen(true)
          setQuery(e.target.value)
          setActiveIndex(-1)
        }}
        onKeyDown={onKeyDown}
      />

      {open ? (
        <div
          ref={menuRef}
          className="dropdown-menu show w-100"
          style={{ maxHeight: menuMaxHeight, overflowY: 'auto', minWidth: 420 }}
        >
          <button
            type="button"
            className={`dropdown-item ${activeIndex === -1 ? 'active' : ''}`}
            data-idx={-1}
            onMouseEnter={() => setActiveIndex(-1)}
            onClick={() => commitSelection(-1)}
            title={emptyLabel}
          >
            <span className="text-truncate d-inline-block" style={{ maxWidth: '100%' }}>
              {emptyLabel}
            </span>
          </button>

          <div className="dropdown-divider" />

          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-muted small">Sin resultados</div>
          ) : (
            filtered.map((o, i) => (
              <button
                key={String(o.value)}
                type="button"
                className={`dropdown-item ${activeIndex === i ? 'active' : ''}`}
                data-idx={i}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commitSelection(i)}
                title={o.label}
              >
                <span className="text-truncate d-inline-block" style={{ maxWidth: '100%' }}>
                  {o.label}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
