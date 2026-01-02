import { apiClient } from './client'
import type { MachineBase, MachineCreatePayload, MachineUpdatePayload, PaginatedResponse } from './types'

export async function fetchMachines(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<MachineBase>> {
  const res = await apiClient.get<PaginatedResponse<MachineBase>>('/api/catalog/machines/', {
    params: { page: params.page, page_size: params.pageSize }
  })
  return res.data
}

export async function fetchMachine(id: number): Promise<MachineBase> {
  const res = await apiClient.get<MachineBase>(`/api/catalog/machines/${id}/`)
  return res.data
}

export async function crearMachine(payload: MachineCreatePayload): Promise<MachineBase> {
  const res = await apiClient.post<MachineBase>('/api/catalog/machines/', payload)
  return res.data
}

export async function editarMachine(id: number, payload: MachineUpdatePayload): Promise<MachineBase> {
  const res = await apiClient.put<MachineBase>(`/api/catalog/machines/${id}/`, payload)
  return res.data
}

export async function eliminarMachine(id: number): Promise<void> {
  await apiClient.delete(`/api/catalog/machines/${id}/`)
}
