import React, { useEffect, useRef } from 'react'
import { useToast } from '../../hooks/useToast'

export type Flash = {
  type: 'success' | 'danger' | 'warning' | 'info'
  message: string
}

const FlashAlert: React.FC<{ flash: Flash | null; onClose: () => void }> = ({ flash, onClose }) => {
  const toast = useToast()
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    if (!flash) return

    // Evita duplicados si el componente re-renderiza con el mismo flash
    const key = `${flash.type}:${flash.message}`
    if (lastKey.current === key) return
    lastKey.current = key

    if (flash.type === 'success') toast.success(flash.message, { title: 'OK' })
    else if (flash.type === 'danger') toast.error(flash.message, { title: 'Error' })
    else if (flash.type === 'warning') toast.warning(flash.message, { title: 'Atención' })
    else toast.info(flash.message)

    // Consumimos el flash para que no quede "pegado"
    onClose()
  }, [flash, onClose, toast])

  // Compat: antes renderizaba un alert inline. Ahora lo elevamos a toast global (arriba a la derecha).
  return null
}

export default FlashAlert
