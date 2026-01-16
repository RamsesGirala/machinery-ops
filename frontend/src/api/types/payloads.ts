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
  monto_minimo?: string | null
  siempre_incluir: boolean
  se_imprime_en_presupuesto: boolean
}
export type TaxUpdatePayload = TaxCreatePayload

export type ClientCreatePayload = {
  nombre: string
  telefono?: string | null
  email?: string | null
}
export type ClientUpdatePayload = ClientCreatePayload

export type PreTaxChargeCreatePayload = {
  nombre: string
  porcentaje: string
  siempre_incluir: boolean
}
export type PreTaxChargeUpdatePayload = PreTaxChargeCreatePayload

export type AdditionalChargeCreatePayload = {
  nombre: string
  porcentaje: string
  monto_minimo?: string | null
  siempre_incluir: boolean
}
export type AdditionalChargeUpdatePayload = AdditionalChargeCreatePayload

export type BudgetItemIn = {
  machine_base_id: number
  cantidad: number
  accesorios?: { accessory_id: number; cantidad: number }[]
}

export type BudgetTaxIn = {
  tax_id: number
  incluido?: boolean
  porcentaje?: string
  monto_minimo?: string | null
}


export type BudgetLogisticsIn = {
  logistics_leg_id: number
  total: string
}


export type BudgetPreTaxChargeIn = {
  pre_tax_charge_id: number
  incluido: boolean
  porcentaje: string
  apply_to_item_indexes?: number[]
}

export type BudgetAdditionalChargeIn = {
  additional_charge_id: number
  incluido?: boolean
  porcentaje?: string
  monto_minimo?: string | null
}

export type BudgetCreatePayload = {
  numero?: string
  fecha: string
  cliente_id?: number | null
  items: BudgetItemIn[]
  pretax_charges?: BudgetPreTaxChargeIn[]
  impuestos?: BudgetTaxIn[]
  additional_charges?: BudgetAdditionalChargeIn[]
  logisticas?: BudgetLogisticsIn[]
}


export type BudgetUpdatePayload = BudgetCreatePayload & {
  notas?: string
}

export type RevenuePaymentIn = {
  monto: string
  metodo_pago: 'TRANSFERENCIA' | 'TARJETA_CREDITO' | 'CHEQUE'
  fecha_prevista: string
  descripcion?: string
}

export type MarkRentedPayload = {
  cliente_id: number
  rental_tipo: 'MENSUAL' | 'SEMANAL' | 'DIARIO'
  rental_inicio: string
  rental_fin_estimado: string
  monto_unitario: string
  metodo_pago: 'TRANSFERENCIA' | 'TARJETA_CREDITO' | 'CHEQUE'
  pago_unico?: boolean
  payments?: RevenuePaymentIn[]
  notas?: string
}

export type FinishRentalPayload = {
  rental_fin_real: string
}

export type MarkSoldPayload = {
  cliente_id: number
  fecha_operacion: string
  monto_total_final: string
  metodo_pago: 'TRANSFERENCIA' | 'TARJETA_CREDITO' | 'CHEQUE'
  cheques_cuotas?: number
  payments?: RevenuePaymentIn[]
  notas?: string
}

