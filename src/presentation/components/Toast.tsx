import { useEffect } from 'react'
import { useAppStore } from '@/presentation/store/appStore'

export function Toast() {
  const message = useAppStore((s) => s.toastMessage)
  const token = useAppStore((s) => s.toastToken)
  const clearToast = useAppStore((s) => s.clearToast)

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => clearToast(), 2400)
    return () => window.clearTimeout(timer)
  }, [message, token, clearToast])

  return (
    <div className={`toast${message ? ' toast--on' : ''}`}>{message}</div>
  )
}
