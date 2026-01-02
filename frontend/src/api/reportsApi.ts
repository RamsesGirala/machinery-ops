import { apiClient } from './client'

export type FinanceDayRow = {
  fecha: string
  ingresos: string
  egresos: string
  ganancia: string
}

export type FinanceReport = {
  desde: string
  hasta: string
  totales: {
    ingresos: string
    egresos: string
    ganancia: string
  }
  serie_diaria: FinanceDayRow[]
}

export async function fetchFinanceReport(params: { desde: string; hasta: string }): Promise<FinanceReport> {
  const res = await apiClient.get<FinanceReport>('/api/reports/finance/', { params })
  return res.data
}
