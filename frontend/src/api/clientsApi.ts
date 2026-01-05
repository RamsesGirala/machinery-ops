import { apiClient } from './client'
import type { Client, ClientCreatePayload, ClientUpdatePayload, PaginatedResponse } from './types'

export async function fetchClients(params: { page?: number; pageSize?: number; q?: string } = {}): Promise<PaginatedResponse<Client>> {
  const res = await apiClient.get<PaginatedResponse<Client>>('/api/catalog/clients/', {
    params: { page: params.page, page_size: params.pageSize, q: params.q }
  })
  return res.data
}

export async function fetchClientsAll(): Promise<Client[]> {
  const res = await apiClient.get<Client[]>('/api/catalog/clients/all/')
  return res.data
}

export async function fetchClient(id: number): Promise<Client> {
  const res = await apiClient.get<Client>(`/api/catalog/clients/${id}/`)
  return res.data
}

export async function crearClient(payload: ClientCreatePayload): Promise<Client> {
  const res = await apiClient.post<Client>('/api/catalog/clients/', payload)
  return res.data
}

export async function editarClient(id: number, payload: ClientUpdatePayload): Promise<Client> {
  const res = await apiClient.put<Client>(`/api/catalog/clients/${id}/`, payload)
  return res.data
}

export async function eliminarClient(id: number): Promise<void> {
  await apiClient.delete(`/api/catalog/clients/${id}/`)
}
