import { useToastContext } from '../components/global/ToastProvider'

export function useToast() {
  return useToastContext()
}
