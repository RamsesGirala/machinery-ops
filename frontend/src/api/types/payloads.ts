import type { EtapaEnum, TipoEnum } from './models'

export type AccessoryCreatePayload = {
  nombre: string
  total: string
}
export type AccessoryUpdatePayload = AccessoryCreatePayload

export type MachineCreatePayload = {
  nombre: string
  total: string
}
export type MachineUpdatePayload = MachineCreatePayload

export type LogisticsLegCreatePayload = {
  desde: string
  hasta: string
  total: string
  etapa: EtapaEnum
}
export type LogisticsLegUpdatePayload = LogisticsLegCreatePayload

export type TaxCreatePayload = {
  nombre: string
  porcentaje: string
  etapa: EtapaEnum
}
export type TaxUpdatePayload = TaxCreatePayload

export type BudgetItemIn = {
  machine_base_id: number
  cantidad: number
  accesorios?: { accessory_id: number; cantidad: number }[]
}

export type BudgetTaxIn = {
  tax_id: number
  etapa: EtapaEnum
}

export type BudgetLogisticsIn = {
  logistics_leg_id: number
  total: string
  etapa: EtapaEnum
}

export type BudgetCreatePayload = {
  numero: string
  fecha: string
  tipo: TipoEnum
  items?: BudgetItemIn[]
  impuestos?: BudgetTaxIn[]
  logisticas?: BudgetLogisticsIn[]
}

export type BudgetUpdatePayload = BudgetCreatePayload & {
  notas?: string
}

export type MarkRentedPayload = {
  inicio_year: number
  inicio_month: number
  retorno_estimada_year: number
  retorno_estimada_month: number
  monto_mensual: string
  notas?: string
}

export type FinishRentalPayload = {
  retorno_real_year: number
  retorno_real_month: number
}

export type MarkSoldPayload = {
  fecha_venta: string
  monto_total: string
  cliente_texto?: string
  notas?: string
}
