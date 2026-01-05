import { apiClient } from './client'
import type { PaginatedResponse } from './types'

export type RevenuePaymentListItem = {
  id: number
  revenue_event: number
  revenue_event_tipo: string
  cliente: { id: number; nombre: string }
  monto: string
  metodo_pago: string
  fecha_prevista: string
  cobrado: boolean
  fecha_cobro_real: string | null
  descripcion: string | null
  created_at: string
  updated_at: string
}

export type PaymentsListFilters = {
  page?: number
  pageSize?: number
  cobrado?: boolean
  clienteId?: number
  metodoPago?: string
  tipo?: string
  fechaDesde?: string
  fechaHasta?: string
}

export async function fetchRevenuePayments(filters: PaymentsListFilters = {}): Promise<PaginatedResponse<RevenuePaymentListItem>> {
  const q: any = {}
  if (filters.page) q.page = filters.page
  if (filters.pageSize) q.page_size = filters.pageSize
  if (filters.cobrado !== undefined) q.cobrado = String(filters.cobrado)
  if (filters.clienteId) q.cliente_id = filters.clienteId
  if (filters.metodoPago) q.metodo_pago = filters.metodoPago
  if (filters.tipo) q.tipo = filters.tipo
  if (filters.fechaDesde) q.fecha_desde = filters.fechaDesde
  if (filters.fechaHasta) q.fecha_hasta = filters.fechaHasta

  const res = await apiClient.get<PaginatedResponse<RevenuePaymentListItem>>('/api/payments/', { params: q })
  return res.data
}

export async function markPaymentPaid(id: number, fechaCobroReal?: string) {
  const res = await apiClient.post(`/api/payments/${id}/mark-paid/`, fechaCobroReal ? { fecha_cobro_real: fechaCobroReal } : {})
  return res.data
}
