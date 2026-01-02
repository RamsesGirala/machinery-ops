export function drfErrorToMessage(err: any, fallback: string): string {
  const data = err?.response?.data
  if (!data) return fallback

  const domMsg = data?.error?.message
  if (domMsg && typeof domMsg === 'string') return domMsg

  if (typeof data === 'string') return data
  if (data?.detail && typeof data.detail === 'string') return data.detail

  // Errores por campo: { campo: ["msg1", "msg2"] }
  if (typeof data === 'object') {
    const parts: string[] = []
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v)) {
        parts.push(`${k}: ${v.join(' ')}`)
      } else if (typeof v === 'string') {
        parts.push(`${k}: ${v}`)
      }
    }
    if (parts.length) return parts.join(' · ')
  }

  return fallback
}
