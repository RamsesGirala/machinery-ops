import React from 'react'

export type Flash = {
  type: 'success' | 'danger' | 'warning' | 'info'
  message: string
}

const FlashAlert: React.FC<{ flash: Flash | null; onClose: () => void }> = ({ flash, onClose }) => {
  if (!flash) return null

  return (
    <div className={`alert alert-${flash.type} d-flex justify-content-between align-items-center`} role="alert">
      <div>{flash.message}</div>
      <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
    </div>
  )
}

export default FlashAlert
