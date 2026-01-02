export interface Accessory {
  id: number
  nombre: string
  total: string
  created_at: string
  updated_at: string
}

export interface MachineBase {
  id: number
  nombre: string
  total: string
  created_at: string
  updated_at: string
}

export interface LogisticsLeg {
  id: number
  desde: string
  hasta: string
  nombre: string
  total: string
  etapa: string
  created_at: string
  updated_at: string
}

export interface Tax {
  id: number
  nombre: string
  porcentaje: string
  etapa: string
  created_at: string
  updated_at: string
}

export type EtapaEnum = 'PRE' | 'POST'
export type TipoEnum = 'VENTA' | 'ALQUILER'

export interface Budget {
  id: number
  numero: string
  fecha: string
  estado: string
  machine_bases?: string[]

  tiene_compra?: boolean
  compra_id?: number | null

  base_imponible_snapshot: string
  total_impuestos_snapshot: string
  total_snapshot: string
  created_at: string
  updated_at: string
}

export interface BudgetItemAccessoryOut {
  id: number
  accessory: number
  accessory_nombre: string
  cantidad: number
  accessory_total_snapshot: string
  subtotal_snapshot: string
}

export interface BudgetItemOut {
  id: number
  machine_base: number
  machine_base_nombre: string
  cantidad: number
  machine_total_snapshot: string
  subtotal_maquina_snapshot: string
  accesorios: BudgetItemAccessoryOut[]
}

export interface BudgetTaxOut {
  id: number
  tax: number
  tax_nombre: string
  etapa: string
  porcentaje_snapshot: string
  total_snapshot: string
}

export interface BudgetLogisticsOut {
  id: number
  logistics_leg: number
  logistics_nombre: string
  etapa: string
  total_snapshot: string
}

export interface BudgetDetail extends Budget {
  subtotal_maquinas_snapshot: string
  subtotal_accesorios_snapshot: string
  items: BudgetItemOut[]
  impuestos: BudgetTaxOut[]
  logisticas: BudgetLogisticsOut[]
}

export interface PurchasedUnit {
  id: number
  purchase_id: number
  fecha_compra: string
  budget_numero: string
  machine_base: number
  machine_nombre: string
  estado: string
  total_compra?: string
  identificador: string
  created_at: string
  updated_at: string
}

export interface RevenueEventForUnit {
  id: number
  tipo: string
  fecha: string
  monto_total: string
  monto_mensual: string | null
  notas: string

  inicio_year: number | null
  inicio_month: number | null
  retorno_estimada_year: number | null
  retorno_estimada_month: number | null
  retorno_real_year: number | null
  retorno_real_month: number | null

  created_at: string
  updated_at: string
}

export interface PurchasedUnitAccessory {
  id: number
  accessory: number
  accessory_nombre: string
  cantidad: number
  accessory_total_snapshot: string
  subtotal_snapshot: string
}

export interface PurchasedUnitDetail extends PurchasedUnit {
  total_compra: string
  notas_compra: string
  accesorios: PurchasedUnitAccessory[]

  venta: RevenueEventForUnit | null
  alquileres: RevenueEventForUnit[]
}
