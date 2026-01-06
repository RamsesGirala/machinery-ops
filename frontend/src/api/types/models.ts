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
  tipo: string
  etapa: string
  created_at: string
  updated_at: string
}

export interface Tax {
  id: number
  nombre: string
  porcentaje: string
  monto_minimo: string | null
  siempre_incluir: boolean
  se_imprime_en_presupuesto: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: number
  nombre: string
  telefono: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export interface PreTaxCharge {
  id: number
  nombre: string
  porcentaje: string
  siempre_incluir: boolean
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
  cliente?: { id: number; nombre: string } | null
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
  porcentaje_snapshot: string
  monto_minimo_snapshot: string | null
  monto_aplicado_snapshot: string
}

export interface BudgetLogisticsOut {
  id: number
  logistics_leg: number
  logistics_nombre: string
  etapa: string
  total_snapshot: string
}

export interface BudgetPreTaxChargeOut {
  id: number
  pre_tax_charge: number
  pre_tax_charge_nombre: string
  porcentaje_snapshot: string
  monto_aplicado_snapshot: string
}

export interface BudgetDetail extends Budget {
  cliente: { id: number; nombre: string } | null

  subtotal_maquinas_snapshot: string
  subtotal_accesorios_snapshot: string
  subtotal_logistica_hasta_aduana_snapshot: string
  subtotal_logistica_post_aduana_snapshot: string

  base_pre_impuestos_snapshot: string
  total_pretax_charges_snapshot: string

  items: BudgetItemOut[]
  pretax_charges: BudgetPreTaxChargeOut[]
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
  cliente: { id: number; nombre: string }

  fecha_operacion: string | null

  rental_tipo: string | null
  rental_inicio: string | null
  rental_fin_estimado: string | null
  rental_fin_real: string | null

  monto_unitario: string | null
  monto_total_final: string

  pagos_pendientes: number
  pagos_cobrados: number

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
