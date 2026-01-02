import { useCallback, useState } from 'react'
import type { UnitLifecycleMode, UnitLite } from '../components/units/UnitLifecycleModal'

export function useUnitLifecycleModal() {
  const [show, setShow] = useState(false)
  const [mode, setMode] = useState<UnitLifecycleMode>('rent')
  const [unit, setUnit] = useState<UnitLite | null>(null)

  const open = useCallback((m: UnitLifecycleMode, u: UnitLite) => {
    setMode(m)
    setUnit(u)
    setShow(true)
  }, [])

  const close = useCallback(() => {
    setShow(false)
  }, [])

  return { show, mode, unit, open, close }
}
