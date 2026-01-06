import { useLocation, useNavigate } from 'react-router-dom'

type NavState = { from?: string } | null

export function useReturnTo(defaultPath: string) {
  const nav = useNavigate()
  const location = useLocation()
  const state = (location.state as NavState) ?? null

  const from = state?.from

  const goBack = () => {
    if (from) nav(from)
    else nav(-1)
  }

  const goToDefault = () => nav(defaultPath)

  return { from, goBack, goToDefault }
}
