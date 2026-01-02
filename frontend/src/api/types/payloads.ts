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
  tipo: TipoEnum
  etapa: EtapaEnum
  total: string
}
export type LogisticsLegUpdatePayload = LogisticsLegCreatePayload

export type TaxCreatePayload = {
  nombre: string
  porcentaje: string
  siempre_incluir: boolean
}
export type TaxUpdatePayload = TaxCreatePayload

export type BudgetItemAccessoryIn = {
  accessory_id: number
  cantidad: number
  accessory_total?: string
}

export type BudgetItemIn = {
  machine_base_id: number
  cantidad: number
  machine_total?: string
  accesorios?: BudgetItemAccessoryIn[]
}

export type BudgetTaxIn = {
  tax_id: number
  incluido: boolean
  porcentaje?: string
}

export type BudgetLogisticsIn = {
  logistics_leg_id: number
  total?: string
}

export type BudgetCreatePayload = {
  fecha?: string
  items: BudgetItemIn[]
  impuestos?: BudgetTaxIn[]
  logisticas?: BudgetLogisticsIn[]
}

export type MarkRentedPayload = {
  fecha_inicio: string
  fecha_retorno_estimada: string
  monto_total: string
  cliente_texto?: string
  notas?: string
}

export type FinishRentalPayload = {
  fecha_retorno_real: string
}

export type MarkSoldPayload = {
  fecha_venta: string
  monto_total: string
  cliente_texto?: string
  notas?: string
}

