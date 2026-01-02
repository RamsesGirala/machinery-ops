// src/utils/money.ts

export type MoneyInput = string | number | null | undefined

/**
 * Parsea números que pueden venir como:
 * - 1234.56
 * - "1234.56"
 * - "1234,56"
 * - "1.234,56"
 * - "1,234.56" (lo intenta resolver razonablemente)
 */
export function parseMoney(value: MoneyInput): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  let s = String(value).trim()
  if (!s) return null

  // Dejar solo dígitos, signo, puntos y comas (por si viene con "USD", "U$D", etc.)
  s = s.replace(/[^\d.,-]/g, '')

  if (!s || s === '-' || s === ',' || s === '.') return null

  const hasDot = s.includes('.')
  const hasComma = s.includes(',')

  // Caso típico AR: "1.234,56" => miles '.' y decimal ','
  if (hasDot && hasComma) {
    const lastDot = s.lastIndexOf('.')
    const lastComma = s.lastIndexOf(',')

    if (lastComma > lastDot) {
      // "1.234,56" => "1234.56"
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      // "1,234.56" => "1234.56"
      s = s.replace(/,/g, '')
    }
  } else if (hasComma && !hasDot) {
    // "1234,56" => "1234.56"
    s = s.replace(',', '.')
  }

  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

const formatterAR = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Formatea estilo es-AR pero con prefijo U$D.
 * Ej: 1234567.8 => "U$D 1.234.567,80"
 */
export function formatUSD(value: MoneyInput): string {
  const n = parseMoney(value)
  if (n === null) return '—'
  return `U$D ${formatterAR.format(n)}`
}
