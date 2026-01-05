import { apiClient } from './client'
import type { PreTaxCharge, PreTaxChargeCreatePayload, PreTaxChargeUpdatePayload, PaginatedResponse } from './types'

export async function fetchPreTaxCharges(params: { page?: number; pageSize?: number; q?: string} = {}): Promise<PaginatedResponse<PreTaxCharge>> {
  const res = await apiClient.get<PaginatedResponse<PreTaxCharge>>('/api/catalog/pretax-charges/', {
    params: { page: params.page, page_size: params.pageSize, q: params.q }
  })
  return res.data
}

export async function fetchPreTaxChargesAll(): Promise<PreTaxCharge[]> {
  const res = await apiClient.get<PreTaxCharge[]>('/api/catalog/pretax-charges/all/')
  return res.data
}

export async function fetchPreTaxCharge(id: number): Promise<PreTaxCharge> {
  const res = await apiClient.get<PreTaxCharge>(`/api/catalog/pretax-charges/${id}/`)
  return res.data
}

export async function crearPreTaxCharge(payload: PreTaxChargeCreatePayload): Promise<PreTaxCharge> {
  const res = await apiClient.post<PreTaxCharge>('/api/catalog/pretax-charges/', payload)
  return res.data
}

export async function editarPreTaxCharge(id: number, payload: PreTaxChargeUpdatePayload): Promise<PreTaxCharge> {
  const res = await apiClient.put<PreTaxCharge>(`/api/catalog/pretax-charges/${id}/`, payload)
  return res.data
}

export async function eliminarPreTaxCharge(id: number): Promise<void> {
  await apiClient.delete(`/api/catalog/pretax-charges/${id}/`)
}
