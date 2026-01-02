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

export type TipoEnum = 'TERRESTRE' | 'AEREO' | 'MARITIMO'
export type EtapaEnum = 'HASTA_ADUANA' | 'POST_ADUANA'

export interface LogisticsLeg {
  id: number
  desde: string
  hasta: string
  tipo: TipoEnum
  etapa: EtapaEnum
  total: string
  created_at: string
  updated_at: string
}

export interface Tax {
  id: number
  nombre: string
  porcentaje: string
  siempre_incluir: boolean
  created_at: string
  updated_at: string
}

export interface Budget {
  id: number
  numero: string
  fecha: string
  estado: string

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
  machine_nombre: string
  cantidad: number
  machine_total_snapshot: string
  subtotal_maquina_snapshot: string
  accesorios: BudgetItemAccessoryOut[]
}

export interface BudgetTaxOut {
  id: number
  tax: number
  tax_nombre: string
  incluido: boolean
  porcentaje_snapshot: string
}

export interface BudgetLogisticsOut {
  id: number
  logistics_leg: number
  desde: string
  hasta: string
  tipo: string
  etapa: string
  total_snapshot: string
}

export interface BudgetDetail extends Budget {
  subtotal_maquinas_snapshot: string
  subtotal_accesorios_snapshot: string
  subtotal_logistica_hasta_aduana_snapshot: string
  subtotal_logistica_post_aduana_snapshot: string
  costo_aduana_snapshot: string

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
  identificador: string
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
}

