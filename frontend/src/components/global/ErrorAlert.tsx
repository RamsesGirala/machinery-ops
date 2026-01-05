import React, {useRef, useEffect} from 'react'
import { useToast } from '../../hooks/useToast'

type Props = { message: string }

const ErrorAlert: React.FC<Props> = ({ message }) => {
  console.log(message)
  
  const toast = useToast()
  const last = useRef<string | null>(null)

  useEffect(() => {
    if (!message) return
    if (last.current === message) return
    last.current = message
    toast.error(message, { title: 'Error' })
  }, [message, toast])


  return null
}

export default ErrorAlert
