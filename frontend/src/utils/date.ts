const AR_TZ = 'America/Argentina/Buenos_Aires'

export function formatDateYMD(iso: string): string {
  // para inputs type="date" (YYYY-MM-DD)
  try {
    const d = new Date(iso)
    return d.toISOString().slice(0, 10)
  } catch {
    return iso
  }
}

export function formatDateAR(value?: string | null): string {
  if (!value) return '—'

  // YYYY-MM -> MM/YYYY
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split('-')
    return `${m}/${y}`
  }

  // YYYY-MM-DD -> DD/MM/YYYY (ojo tz)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00`)
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: AR_TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d)
  }

  // ISO datetime
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value

  return new Intl.DateTimeFormat('es-AR', {
    timeZone: AR_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}
