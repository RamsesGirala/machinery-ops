import { apiClient } from './client'
import type { LogisticsLeg, LogisticsLegCreatePayload, LogisticsLegUpdatePayload, PaginatedResponse } from './types'

export async function fetchLogisticsLegs(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<LogisticsLeg>> {
  const res = await apiClient.get<PaginatedResponse<LogisticsLeg>>('/api/catalog/logistics-legs/', {
    params: { page: params.page, page_size: params.pageSize }
  })
  return res.data
}

export async function fetchLogisticsLeg(id: number): Promise<LogisticsLeg> {
  const res = await apiClient.get<LogisticsLeg>(`/api/catalog/logistics-legs/${id}/`)
  return res.data
}

export async function crearLogisticsLeg(payload: LogisticsLegCreatePayload): Promise<LogisticsLeg> {
  const res = await apiClient.post<LogisticsLeg>('/api/catalog/logistics-legs/', payload)
  return res.data
}

export async function editarLogisticsLeg(id: number, payload: LogisticsLegUpdatePayload): Promise<LogisticsLeg> {
  const res = await apiClient.put<LogisticsLeg>(`/api/catalog/logistics-legs/${id}/`, payload)
  return res.data
}

export async function eliminarLogisticsLeg(id: number): Promise<void> {
  await apiClient.delete(`/api/catalog/logistics-legs/${id}/`)
}
