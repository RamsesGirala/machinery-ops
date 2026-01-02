import { apiClient } from './client'
import type { Tax, TaxCreatePayload, TaxUpdatePayload, PaginatedResponse } from './types'

export async function fetchTaxes(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<Tax>> {
  const res = await apiClient.get<PaginatedResponse<Tax>>('/api/catalog/taxes/', {
    params: { page: params.page, page_size: params.pageSize }
  })
  return res.data
}

export async function fetchTax(id: number): Promise<Tax> {
  const res = await apiClient.get<Tax>(`/api/catalog/taxes/${id}/`)
  return res.data
}

export async function crearTax(payload: TaxCreatePayload): Promise<Tax> {
  const res = await apiClient.post<Tax>('/api/catalog/taxes/', payload)
  return res.data
}

export async function editarTax(id: number, payload: TaxUpdatePayload): Promise<Tax> {
  const res = await apiClient.put<Tax>(`/api/catalog/taxes/${id}/`, payload)
  return res.data
}

export async function eliminarTax(id: number): Promise<void> {
  await apiClient.delete(`/api/catalog/taxes/${id}/`)
}
