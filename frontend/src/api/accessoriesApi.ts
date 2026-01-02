import { apiClient } from './client'
import type { Accessory, AccessoryCreatePayload, AccessoryUpdatePayload, PaginatedResponse } from './types'

export async function fetchAccessories(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<Accessory>> {
  const res = await apiClient.get<PaginatedResponse<Accessory>>('/api/catalog/accessories/', {
    params: { page: params.page, page_size: params.pageSize }
  })
  return res.data
}

export async function fetchAccessory(id: number): Promise<Accessory> {
  const res = await apiClient.get<Accessory>(`/api/catalog/accessories/${id}/`)
  return res.data
}

export async function crearAccessory(payload: AccessoryCreatePayload): Promise<Accessory> {
  const res = await apiClient.post<Accessory>('/api/catalog/accessories/', payload)
  return res.data
}

export async function editarAccessory(id: number, payload: AccessoryUpdatePayload): Promise<Accessory> {
  const res = await apiClient.put<Accessory>(`/api/catalog/accessories/${id}/`, payload)
  return res.data
}

export async function eliminarAccessory(id: number): Promise<void> {
  await apiClient.delete(`/api/catalog/accessories/${id}/`)
}
