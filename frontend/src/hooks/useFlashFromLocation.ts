import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { Flash } from '../components/global/FlashAlert'

export function useFlashFromLocation() {
  const location = useLocation()
  const [flash, setFlash] = useState<Flash | null>(null)

  useEffect(() => {
    const state = location.state as any
    if (state?.flash) {
      setFlash(state.flash)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  const clearFlash = () => setFlash(null)

  return { flash, setFlash, clearFlash }
}
