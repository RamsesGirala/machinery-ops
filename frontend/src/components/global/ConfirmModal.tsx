import React from 'react'

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'

type Props = {
  show: boolean
  title?: string

  // Backward compatible: si no pasás body, se usa message.
  message?: string
  body?: React.ReactNode

  confirmText?: string
  cancelText?: string

  confirmVariant?: Variant
  confirmDisabled?: boolean
  cancelDisabled?: boolean

  onConfirm: () => void
  onCancel: () => void
}

const ConfirmModal: React.FC<Props> = ({
  show,
  title = 'Confirmar',
  message = '',
  body,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'danger',
  confirmDisabled = false,
  cancelDisabled = false,
  onConfirm,
  onCancel,
}) => {
  if (!show) return null

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog" style={{ background: 'rgba(0,0,0,.35)' }}>
      <div className="modal-dialog" role="document">
        <div className="modal-content rounded-4">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onCancel} disabled={cancelDisabled} />
          </div>

          <div className="modal-body">
            {body ? body : <p className="mb-0">{message}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={cancelDisabled}>
              {cancelText}
            </button>
            <button
              type="button"
              className={`btn btn-${confirmVariant}`}
              onClick={onConfirm}
              disabled={confirmDisabled}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
