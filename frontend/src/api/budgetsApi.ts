import { apiClient } from './client'
import type { PaginatedResponse } from './types'
import type { Budget, BudgetDetail } from './types/models'
import type { BudgetCreatePayload } from './types/payloads'

export type BudgetsListFilters = {
  page?: number
  pageSize?: number
  fechaDesde?: string
  fechaHasta?: string
  estado?: string
}

export async function fetchBudgets(filters: BudgetsListFilters = {}): Promise<PaginatedResponse<Budget>> {
  const q: any = {}
  if (filters.page) q.page = filters.page
  if (filters.pageSize) q.page_size = filters.pageSize

  if (filters.fechaDesde) q.fecha_desde = filters.fechaDesde
  if (filters.fechaHasta) q.fecha_hasta = filters.fechaHasta
  if (filters.estado) q.estado = filters.estado

  const res = await apiClient.get<PaginatedResponse<Budget>>('/api/budgets/', { params: q })
  return res.data
}

export async function fetchBudget(id: number): Promise<BudgetDetail> {
  const res = await apiClient.get<BudgetDetail>(`/api/budgets/${id}/`)
  return res.data
}

export async function createBudget(payload: BudgetCreatePayload): Promise<BudgetDetail> {
  const res = await apiClient.post<BudgetDetail>('/api/budgets/', payload)
  return res.data
}

export async function deleteBudget(id: number): Promise<void> {
  await apiClient.delete(`/api/budgets/${id}/`)
}

export async function markBudgetPurchased(id: number): Promise<{ ok: boolean; purchase_id: number }> {
  const res = await apiClient.post<{ ok: boolean; purchase_id: number }>(`/api/budgets/${id}/purchase/`, {})
  return res.data
}

export async function updateBudget(id: number, payload: BudgetCreatePayload): Promise<BudgetDetail> {
  const res = await apiClient.put<BudgetDetail>(`/api/budgets/${id}/`, payload)
  return res.data
}