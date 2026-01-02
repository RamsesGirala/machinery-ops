import { apiClient } from './client'
import type { PaginatedResponse } from './types'
import type { PurchasedUnit, PurchasedUnitDetail } from './types/models'
import type { MarkRentedPayload,FinishRentalPayload, MarkSoldPayload} from './types/payloads'

export type UnitsListFilters = {
  page?: number
  pageSize?: number
  estado?: string
  fechaDesde?: string
  fechaHasta?: string
}

export async function fetchPurchasedUnits(filters: UnitsListFilters = {}): Promise<PaginatedResponse<PurchasedUnit>> {
  const q: any = {}
  if (filters.page) q.page = filters.page
  if (filters.pageSize) q.page_size = filters.pageSize
  if (filters.estado) q.estado = filters.estado
  if (filters.fechaDesde) q.fecha_desde = filters.fechaDesde
  if (filters.fechaHasta) q.fecha_hasta = filters.fechaHasta

  const res = await apiClient.get<PaginatedResponse<PurchasedUnit>>('/api/units/', { params: q })
  return res.data
}

export async function fetchPurchasedUnit(id: number): Promise<PurchasedUnitDetail> {
  const res = await apiClient.get<PurchasedUnitDetail>(`/api/units/${id}/`)
  return res.data
}

export async function markUnitRented(unitId: number, payload: MarkRentedPayload) {
  const res = await apiClient.post(`/api/units/${unitId}/mark-rented/`, payload)
  return res.data
}

export async function finishUnitRental(unitId: number, payload: FinishRentalPayload) {
  const res = await apiClient.post(`/api/units/${unitId}/finish-rental/`, payload)
  return res.data
}

export async function markUnitSold(unitId: number, payload: MarkSoldPayload) {
  const res = await apiClient.post(`/api/units/${unitId}/mark-sold/`, payload)
  return res.data
}