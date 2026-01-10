import { apiClient } from './client'
import type {
  AdditionalCharge,
  AdditionalChargeCreatePayload,
  AdditionalChargeUpdatePayload,
  PaginatedResponse
} from './types'

export async function fetchAdditionalCharges(params: { page?: number; pageSize?: number; q?: string } = {}): Promise<PaginatedResponse<AdditionalCharge>> {
  const res = await apiClient.get<PaginatedResponse<AdditionalCharge>>('/api/catalog/additional-charges/', {
    params: { page: params.page, page_size: params.pageSize, q: params.q }
  })
  return res.data
}

export async function fetchAdditionalCharge(id: number): Promise<AdditionalCharge> {
  const res = await apiClient.get<AdditionalCharge>(`/api/catalog/additional-charges/${id}/`)
  return res.data
}

export async function crearAdditionalCharge(payload: AdditionalChargeCreatePayload): Promise<AdditionalCharge> {
  const res = await apiClient.post<AdditionalCharge>('/api/catalog/additional-charges/', payload)
  return res.data
}

export async function editarAdditionalCharge(id: number, payload: AdditionalChargeUpdatePayload): Promise<AdditionalCharge> {
  const res = await apiClient.put<AdditionalCharge>(`/api/catalog/additional-charges/${id}/`, payload)
  return res.data
}

export async function eliminarAdditionalCharge(id: number): Promise<void> {
  await apiClient.delete(`/api/catalog/additional-charges/${id}/`)
}

export async function fetchAdditionalChargesAll(): Promise<AdditionalCharge[]> {
  const res = await apiClient.get<AdditionalCharge[]>('/api/catalog/additional-charges/all/')
  return res.data
}
