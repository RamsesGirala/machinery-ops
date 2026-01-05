import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

export type ToastVariant = 'success' | 'danger' | 'info' | 'warning'

export type ToastItem = {
  id: string
  variant: ToastVariant
  message: string
  title?: string
  timeoutMs: number
}

type ToastContextValue = {
  push: (t: Omit<ToastItem, 'id'>) => void
  success: (message: string, opts?: { title?: string; timeoutMs?: number }) => void
  error: (message: string, opts?: { title?: string; timeoutMs?: number }) => void
  info: (message: string, opts?: { title?: string; timeoutMs?: number }) => void
  warning: (message: string, opts?: { title?: string; timeoutMs?: number }) => void
  remove: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const VARIANT_TO_BG: Record<ToastVariant, string> = {
  // requisito: éxito azul claro (usamos primary de bootstrap)
  success: 'text-bg-primary',
  danger: 'text-bg-danger',
  info: 'text-bg-info',
  warning: 'text-bg-warning'
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Record<string, number>>({})

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const h = timers.current[id]
    if (h) window.clearTimeout(h)
    delete timers.current[id]
  }, [])

  const push = useCallback(
    (t: Omit<ToastItem, 'id'>) => {
      const id = uid()
      const item: ToastItem = { id, ...t }
      setToasts((prev) => [item, ...prev].slice(0, 5)) // máx 5 visibles

      timers.current[id] = window.setTimeout(() => remove(id), t.timeoutMs)
    },
    [remove]
  )

  const api = useMemo<ToastContextValue>(
    () => ({
      push,
      remove,
      success: (message, opts) => push({ variant: 'success', message, title: opts?.title, timeoutMs: opts?.timeoutMs ?? 3500 }),
      error: (message, opts) => push({ variant: 'danger', message, title: opts?.title, timeoutMs: opts?.timeoutMs ?? 6000 }),
      info: (message, opts) => push({ variant: 'info', message, title: opts?.title, timeoutMs: opts?.timeoutMs ?? 4000 }),
      warning: (message, opts) => push({ variant: 'warning', message, title: opts?.title, timeoutMs: opts?.timeoutMs ?? 4500 })
    }),
    [push, remove]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Viewport */}
      <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast show ${VARIANT_TO_BG[t.variant]} border-0 shadow`}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            style={{ minWidth: 320 }}
          >
            <div className="d-flex">
              <div className="toast-body">
                {t.title ? <div className="fw-semibold mb-1">{t.title}</div> : null}
                <div>{t.message}</div>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                aria-label="Close"
                onClick={() => remove(t.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToastContext must be used inside <ToastProvider />')
  }
  return ctx
}
