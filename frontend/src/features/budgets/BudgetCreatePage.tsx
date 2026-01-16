import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createBudget, updateBudget, fetchBudget } from '../../api/budgetsApi'

import { fetchMachinesAll } from '../../api/machinesApi'
import { fetchAccessoriesAll } from '../../api/accessoriesApi'
import { fetchLogisticsLegsAll } from '../../api/logisticsLegsApi'
import { fetchTaxesAll } from '../../api/taxesApi'
import { fetchClientsAll } from '../../api/clientsApi'
import { fetchPreTaxChargesAll } from '../../api/preTaxChargesApi'
import { fetchAdditionalChargesAll } from '../../api/additionalChargesApi'

import type { MachineBase, Accessory, LogisticsLeg, Tax, Client, PreTaxCharge, AdditionalCharge} from '../../api/types/models'
import type { BudgetCreatePayload } from '../../api/types/payloads'
import { formatUSD } from '../../utils/money'
import ErrorAlert from '../../components/global/ErrorAlert'
import SearchSelect from '../../components/global/SearchSelect'
import { useReturnTo } from '../../hooks/useReturnTo'

type MachineLine = {
  machine_base_id: number
  cantidad: number
  accesorios: { accessory_id: number; cantidad: number }[]
}

type LogisticsSel = { logistics_leg_id: number; total: string; etapa: string }
type TaxSel = { tax_id: number; incluido: boolean; porcentaje: string; nombre: string; monto_minimo?: string | null }
type AdditionalChargeSel = { additional_charge_id: number; incluido: boolean; porcentaje: string; nombre: string ;monto_minimo?: string | null}
type PreTaxSel = { pre_tax_charge_id: number; incluido: boolean; porcentaje: string; nombre: string; apply_to_item_indexes?: number[]}

function toNum(s: string): number {
  const n = Number(String(s ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export default function BudgetCreatePage() {
  const nav = useNavigate()
  const { id } = useParams()
  const { goBack } = useReturnTo('/budgets')
  const isEdit = Boolean(id)
  const budgetId = id ? Number(id) : null

  const [machines, setMachines] = useState<MachineBase[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [legs, setLegs] = useState<LogisticsLeg[]>([])
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [pretaxCharges, setPreTaxCharges] = useState<PreTaxCharge[]>([])

  const [clienteId, setClienteId] = useState<number | null>(null)
  const [numero, setNumero] = useState<string>('')

  
  const [pretaxSel, setPretaxSel] = useState<Record<number, PreTaxSel>>({})


  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadingBudget, setLoadingBudget] = useState(false)

  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().slice(0, 10))

  // overrides globales por id (para que si aparece 2 veces sea el mismo valor)
  const [machinePriceById, setMachinePriceById] = useState<Record<number, string>>({})
  const [accessoryPriceById, setAccessoryPriceById] = useState<Record<number, string>>({})

  // líneas de items (máquinas + accesorios por máquina)
  const [items, setItems] = useState<MachineLine[]>([])

  // logística seleccionada
  const [logSel, setLogSel] = useState<Record<number, LogisticsSel>>({})

  // impuestos seleccionados (incluido + porcentaje override)
  const [taxSel, setTaxSel] = useState<Record<number, TaxSel>>({})

  // cargos adicionales seleccionados (incluido + porcentaje/minimo override)
  const [additionalSel, setAdditionalSel] = useState<Record<number, AdditionalChargeSel>>({})
  
  // pickers buscables
  const [machinePickId, setMachinePickId] = useState<number | ''>('')
  const [accessoryPickByLine, setAccessoryPickByLine] = useState<Record<number, number | ''>>({})


  const machineById = useMemo(() => new Map(machines.map((m) => [m.id, m])), [machines])
  const accessoryById = useMemo(() => new Map(accessories.map((a) => [a.id, a])), [accessories])
  const legById = useMemo(() => new Map(legs.map((l) => [l.id, l])), [legs])

  // 1) Cargar catálogo (siempre)
  useEffect(() => {
    ;(async () => {
      try {
        setError(null)
        const [mAll, aAll, lAll, tAll, acAll, cAll, pAll] = await Promise.all([
          fetchMachinesAll(),
          fetchAccessoriesAll(),
          fetchLogisticsLegsAll(),
          fetchTaxesAll(),
          fetchAdditionalChargesAll(),
          fetchClientsAll(),
          fetchPreTaxChargesAll(),
        ])

        setMachines(mAll)
        setAccessories(aAll)
        setLegs(lAll)
        setTaxes(tAll)
        setAdditionalCharges(acAll)
        setClients(cAll)
        setPreTaxCharges(pAll)
        
        // pretax init
        const pinit: Record<number, PreTaxSel> = {}
        for (const p of pAll) {
          pinit[p.id] = {
            pre_tax_charge_id: p.id,
            incluido: p.siempre_incluir ? true : false,
            porcentaje: p.porcentaje,
            nombre: p.nombre,
          }
        }
        setPretaxSel(pinit)

        // Inicializamos taxSel con todos los impuestos: incluido si siempre_incluir, porcentaje editable
        const init: Record<number, TaxSel> = {}
        for (const tx of tAll) {
          init[tx.id] = {
            tax_id: tx.id,
            incluido: tx.siempre_incluir ? true : false,
            porcentaje: tx.porcentaje,
            nombre: tx.nombre,
            monto_minimo: tx.monto_minimo ?? null,
          }
        }
        setTaxSel(init)

        // Inicializamos additionalSel con todos: incluido si siempre_incluir, porcentaje y mínimo editable
        const acInit: Record<number, AdditionalChargeSel> = {}
        for (const c of acAll) {
          acInit[c.id] = {
            additional_charge_id: c.id,
            incluido: c.siempre_incluir ? true : false,
            porcentaje: c.porcentaje,
            nombre: c.nombre,
            monto_minimo: c.monto_minimo ?? null,
          }
        }
        setAdditionalSel(acInit)

      } catch {
        setError('No se pudo cargar el catálogo necesario para crear/editar el presupuesto.')
      }
    })()
  }, [])

  // 2) Si es edición: cargar presupuesto y precargar estados
  useEffect(() => {
    if (!isEdit || !budgetId) return
    // esperamos a que haya catálogo cargado para que los maps tengan data (no es obligatorio, pero ayuda)
    if (machines.length === 0 && accessories.length === 0 && legs.length === 0 && taxes.length === 0) {
      // igual intentamos cuando el catálogo termine de llegar (por el dep)
      // el effect se re-ejecuta porque cambian machines/accessories/legs/taxes.
    }

    let mounted = true
    ;(async () => {
      try {
        setError(null)
        setLoadingBudget(true)
        const b: any = await fetchBudget(budgetId)
        if (!mounted) return

        // fecha
        if (b?.fecha) setFecha(b.fecha)
        if (b?.numero !== undefined) setNumero(String(b.numero ?? ''))
        setClienteId(b?.cliente?.id ?? b?.cliente_id ?? null)

        // Items: setItems + overrides globales para máquinas/accesorios
        const nextItems: MachineLine[] = (b?.items || []).map((it: any) => ({
          machine_base_id: Number(it.machine_base ?? it.machine_base_id ?? it.machine_base_id),
          cantidad: Number(it.cantidad ?? 1),
          accesorios: (it.accesorios || []).map((a: any) => ({
            accessory_id: Number(a.accessory ?? a.accessory_id),
            cantidad: Number(a.cantidad ?? 1),
          })),
        }))
        setItems(nextItems)

        // overrides máquinas
        const mp: Record<number, string> = {}
        for (const it of b?.items || []) {
          const mid = Number(it.machine_base ?? it.machine_base_id)
          const val = it.machine_total_snapshot ?? it.machine_total ?? it.total ?? null
          if (val !== null && val !== undefined) mp[mid] = String(val)
        }
        setMachinePriceById((prev) => ({ ...prev, ...mp }))

        // overrides accesorios
        const ap: Record<number, string> = {}
        for (const it of b?.items || []) {
          for (const acc of it.accesorios || []) {
            const aid = Number(acc.accessory ?? acc.accessory_id)
            const val = acc.accessory_total_snapshot ?? acc.accessory_total ?? acc.total ?? null
            if (val !== null && val !== undefined) ap[aid] = String(val)
          }
        }
        setAccessoryPriceById((prev) => ({ ...prev, ...ap }))

        // Logística: seleccionada + totales snapshot
        const ls: Record<number, LogisticsSel> = {}
        for (const lg of b?.logisticas || []) {
          const lid = Number(lg.logistics_leg ?? lg.logistics_leg_id)
          const total = String(lg.total_snapshot ?? lg.total ?? '')
          // etapa la sacamos del catálogo (si ya está), si no viene del backend y la calculamos después
          const etapa = String(lg.etapa ?? legById.get(lid)?.etapa ?? '')
          ls[lid] = { logistics_leg_id: lid, total, etapa }
        }
        setLogSel(ls)

        // Impuestos: SOLO los del presupuesto (y mantenemos el resto no incluido)
        // Si en tu backend ya manda solo los incluidos, igual lo soporta.
        const tsUpdate: Record<number, TaxSel> = {}
        for (const tx of b?.impuestos || []) {
          const tid = Number(tx.tax ?? tx.tax_id)
          const porcentaje = String(tx.porcentaje_snapshot ?? tx.porcentaje ?? '')
          const incluido = Boolean(tx.incluido ?? true)
          const nombre = String(tx.nombre ?? (taxes.find((x) => x.id === tid)?.nombre ?? ''))
          const monto_minimo = tx.monto_minimo_snapshot ?? null
          tsUpdate[tid] = { tax_id: tid, incluido, porcentaje, nombre, monto_minimo}
        }

        // combinamos con taxSel actual (para conservar los que no están en el presupuesto)
        setTaxSel((prev) => {
          const merged = { ...prev }
          // primero des-incluir todos (pero sin perder porcentaje default)
          for (const k of Object.keys(merged)) merged[Number(k)] = { ...merged[Number(k)], incluido: false }
          // luego aplicamos lo del presupuesto
          for (const [k, v] of Object.entries(tsUpdate)) merged[Number(k)] = { ...(merged[Number(k)] ?? v), ...v }
          return merged
        })

        // Cargos adicionales: solo los del presupuesto (y mantenemos el resto no incluido)
        const acUpdate: Record<number, AdditionalChargeSel> = {}
        for (const c of b?.additional_charges || []) {
          const cid = Number(c.additional_charge ?? c.additional_charge_id)
          const porcentaje = String(c.porcentaje_snapshot ?? c.porcentaje ?? '')
          const incluido = true // el backend nos devuelve solo incluidos
          const nombre = String(c.additional_charge_nombre ?? (additionalCharges.find((x) => x.id === cid)?.nombre ?? ''))
          const monto_minimo = c.monto_minimo_snapshot ?? null
          acUpdate[cid] = { additional_charge_id: cid, incluido, porcentaje, nombre, monto_minimo }
        }

        setAdditionalSel((prev) => {
          const merged = { ...prev }
          for (const k of Object.keys(merged)) merged[Number(k)] = { ...merged[Number(k)], incluido: false }
          for (const [k, v] of Object.entries(acUpdate)) merged[Number(k)] = { ...(merged[Number(k)] ?? v), ...v }
          return merged
        })
        
        const psUpdate: Record<number, PreTaxSel> = {}

        // Mapeo item_id -> index según el orden que vino el budget detail (mismo orden que usamos para setItems)
        const itemIdToIndex = new Map<number, number>()
        ;(b?.items || []).forEach((it: any, idx: number) => {
          const iid = Number(it.id)
          if (!Number.isNaN(iid)) itemIdToIndex.set(iid, idx)
        })

        for (const p of b?.pretax_charges || []) {
          const pid = Number(p.pre_tax_charge ?? p.pre_tax_charge_id)
          const porcentaje = String(p.porcentaje_snapshot ?? p.porcentaje ?? '')
          const incluido = Boolean(p.incluido ?? true)
          const nombre = String(p.nombre ?? (pretaxCharges.find((x) => x.id === pid)?.nombre ?? ''))

          const appliedIds: number[] = Array.isArray(p.applied_to_budget_item_ids) ? p.applied_to_budget_item_ids : []
          const idxs = appliedIds
            .map((id: number) => itemIdToIndex.get(Number(id)))
            .filter((x: any) => x !== undefined) as number[]

          // Si viene [] => “todos” => lo dejamos undefined para que la UI lo interprete como “Todos”
          psUpdate[pid] = {
            pre_tax_charge_id: pid,
            incluido,
            porcentaje,
            nombre,
            apply_to_item_indexes: idxs.length > 0 ? idxs : undefined,
          }
        }

        setPretaxSel((prev) => {
          const merged = { ...prev }
          for (const k of Object.keys(merged)) merged[Number(k)] = { ...merged[Number(k)], incluido: false }
          for (const [k, v] of Object.entries(psUpdate)) merged[Number(k)] = { ...(merged[Number(k)] ?? v), ...v }
          return merged
        })

      } catch {
        setError('No se pudo cargar el presupuesto para editar.')
      } finally {
        if (mounted) setLoadingBudget(false)
      }
    })()

    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, budgetId, legs.length, taxes.length, machines.length, accessories.length])

  // completar etapa en logSel si quedó vacía (ej: presupuesto vino sin etapa)
  useEffect(() => {
    if (Object.keys(logSel).length === 0) return
    const needsFix = Object.values(logSel).some((x) => !x.etapa)
    if (!needsFix) return

    setLogSel((prev) => {
      const copy = { ...prev }
      for (const key of Object.keys(copy)) {
        const id = Number(key)
        if (!copy[id].etapa) {
          const leg = legById.get(id)
          if (leg) copy[id] = { ...copy[id], etapa: leg.etapa }
        }
      }
      return copy
    })
  }, [legs, legById, logSel])

  const calc = useMemo(() => {
    const subtotalMaquinas = items.reduce((acc, it) => {
      const unit = toNum(machinePriceById[it.machine_base_id] ?? machineById.get(it.machine_base_id)?.total ?? '0')
      return acc + unit * it.cantidad
    }, 0)

    const subtotalAcc = items.reduce((acc, it) => {
      const accSum = it.accesorios.reduce((a2, a) => {
        const unit = toNum(accessoryPriceById[a.accessory_id] ?? accessoryById.get(a.accessory_id)?.total ?? '0')
        return a2 + unit * a.cantidad
      }, 0)
      return acc + accSum
    }, 0)

    let logHasta = 0
    let logPost = 0
    for (const sel of Object.values(logSel)) {
      if (sel.etapa === 'HASTA_ADUANA') logHasta += toNum(sel.total)
      else logPost += toNum(sel.total)
    }

    const basePre = subtotalMaquinas + subtotalAcc + logHasta

    // base por item: (maquina*cantidad + accesorios)
    const itemBases = items.map((it) => {
      const mUnit = toNum(machinePriceById[it.machine_base_id] ?? machineById.get(it.machine_base_id)?.total ?? '0')
      const mSubtotal = mUnit * it.cantidad
      const accSubtotal = it.accesorios.reduce((a2, a) => {
        const unit = toNum(accessoryPriceById[a.accessory_id] ?? accessoryById.get(a.accessory_id)?.total ?? '0')
        return a2 + unit * a.cantidad
      }, 0)
      return mSubtotal + accSubtotal
    })

    let pretaxTotal = 0
    for (const p of Object.values(pretaxSel)) {
      if (!p.incluido) continue

      const idxs = p.apply_to_item_indexes
      const baseForCharge =
        idxs && idxs.length > 0
          ? (idxs.reduce((acc, i) => acc + (itemBases[i] ?? 0), 0) + logHasta)
          : basePre

      const pct = toNum(p.porcentaje) / 100
      pretaxTotal += baseForCharge * pct
    }

    const baseImponible = basePre + pretaxTotal

    let impuestos = 0
    for (const tx of Object.values(taxSel)) {
      if (!tx.incluido) continue

      const pct = toNum(tx.porcentaje) / 100
      const montoPct = baseImponible * pct

      const catalogMin = taxes.find((x) => x.id === tx.tax_id)?.monto_minimo ?? null
      let monto = montoPct

      if (catalogMin !== null && catalogMin !== undefined) {
        const minOverrideOrCatalog = tx.monto_minimo ?? catalogMin
        const minVal = toNum(String(minOverrideOrCatalog))
        monto = Math.max(montoPct, minVal)
      }

      impuestos += monto
    }

    // Cargos adicionales: sobre (máquinas + accesorios) y se suma al total final (NO base imponible)
    let additionalTotal = 0
    const baseItems = subtotalMaquinas + subtotalAcc

    for (const c of Object.values(additionalSel)) {
      if (!c.incluido) continue

      const pct = toNum(c.porcentaje) / 100
      const montoPct = baseItems * pct

      const catalogMin = additionalCharges.find((x) => x.id === c.additional_charge_id)?.monto_minimo ?? null
      let monto = montoPct

      if (catalogMin !== null && catalogMin !== undefined) {
        const minOverrideOrCatalog = c.monto_minimo ?? catalogMin
        const minVal = toNum(String(minOverrideOrCatalog))
        monto = Math.max(montoPct, minVal)
      }

      additionalTotal += monto
    }

    const total = baseImponible + impuestos + logPost + additionalTotal

    return {subtotalMaquinas,subtotalAcc,logHasta,logPost,basePre,pretaxTotal,baseImponible,impuestos,additionalTotal,total}
  }, [items, logSel, pretaxSel, taxSel, additionalSel, taxes, additionalCharges, machinePriceById, accessoryPriceById, machineById, accessoryById])

  function addMachineLine(machineId: number) {
    const m = machineById.get(machineId)
    if (!m) return

    // inicializa override global si todavía no existe
    setMachinePriceById((prev) => (prev[m.id] ? prev : { ...prev, [m.id]: m.total }))

    setItems((prev) => [
      ...prev,
      {
        machine_base_id: m.id,
        cantidad: 1,
        accesorios: [],
      },
    ])
  }

  function addAccessoryToItem(itemIndex: number, accessoryId: number) {
    const a = accessoryById.get(accessoryId)
    if (!a) return

    // inicializa override global si todavía no existe
    setAccessoryPriceById((prev) => (prev[a.id] ? prev : { ...prev, [a.id]: a.total }))

    setItems((prev) => {
      const copy = [...prev]
      copy[itemIndex] = {
        ...copy[itemIndex],
        accesorios: [...copy[itemIndex].accesorios, { accessory_id: a.id, cantidad: 1 }],
      }
      return copy
    })
  }

  function toggleLeg(id: number) {
    const leg = legById.get(id)
    if (!leg) return
    setLogSel((prev) => {
      const copy = { ...prev }
      if (copy[id]) delete copy[id]
      else copy[id] = { logistics_leg_id: id, total: leg.total, etapa: leg.etapa }
      return copy
    })
  }

  async function onSave() {
    setError(null)
    if (items.length === 0) {
      setError('Tenés que agregar al menos 1 item.')
      return
    }

    setSaving(true)
    try {
      const payload: BudgetCreatePayload = {
        fecha,
        numero,
        cliente_id: clienteId,
        items: items.map((it) => ({
          machine_base_id: it.machine_base_id,
          cantidad: it.cantidad,
          machine_total: machinePriceById[it.machine_base_id] ?? machineById.get(it.machine_base_id)?.total,
          accesorios: it.accesorios.map((a) => ({
            accessory_id: a.accessory_id,
            cantidad: a.cantidad,
            accessory_total: accessoryPriceById[a.accessory_id] ?? accessoryById.get(a.accessory_id)?.total,
          })),
        })),
        logisticas: Object.values(logSel).map((l) => ({
          logistics_leg_id: l.logistics_leg_id,
          total: l.total,
        })),
        pretax_charges: Object.values(pretaxSel).map((p) => ({
          pre_tax_charge_id: p.pre_tax_charge_id,
          incluido: p.incluido,
          porcentaje: p.porcentaje,
          ...(p.apply_to_item_indexes && p.apply_to_item_indexes.length > 0
            ? { apply_to_item_indexes: p.apply_to_item_indexes }
            : {}),
        })),
        impuestos: Object.values(taxSel).map((t) => {
          const catalogMin = taxes.find((x) => x.id === t.tax_id)?.monto_minimo ?? null

          return {
            tax_id: t.tax_id,
            incluido: t.incluido,
            porcentaje: t.porcentaje,
            ...(catalogMin !== null && catalogMin !== undefined
              ? { monto_minimo: (t.monto_minimo ?? catalogMin) }
              : {}),
          }
        }),
        additional_charges: Object.values(additionalSel).map((c) => {
          const catalogMin = additionalCharges.find((x) => x.id === c.additional_charge_id)?.monto_minimo ?? null

          return {
            additional_charge_id: c.additional_charge_id,
            incluido: c.incluido,
            porcentaje: c.porcentaje,
            ...(catalogMin !== null && catalogMin !== undefined
              ? { monto_minimo: (c.monto_minimo ?? catalogMin) }
              : {}),
          }
        }),

      }

      if (isEdit && budgetId) {
        const updated: any = await updateBudget(budgetId, payload)
        nav(`/budgets/${updated.id}`)
      } else {
        const created: any = await createBudget(payload)
        nav(`/budgets/${created.id}`)
      }
    } catch (e : any) {      
      setError(isEdit ? ('No se pudo editar el presupuesto. ' + e.response.data.error.message) : ('No se pudo crear el presupuesto. ' + e.response.data.error.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-start justify-content-between mb-3">
        <div>
          <h2 className="mb-1">{isEdit ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</h2>
          {loadingBudget ? <div className="text-muted small">Cargando presupuesto...</div> : null}
        </div>

        <button className="btn btn-outline-secondary" onClick={goBack}>
          Volver
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Header */}
      <div className="card mb-3">
        <div className="card-body row g-3">
          <div className="col-md-3">
            <label className="form-label">Fecha</label>
            <input type="date" className="form-control" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>

          <div className="col-md-4">
            <label className="form-label">Número (opcional)</label>
            <input
              type="text"
              className="form-control"
              value={numero}
              placeholder="Dejá vacío para autogenerar"
              onChange={(e) => setNumero(e.target.value)}
            />
            <div className="form-text">Si lo dejás vacío, se generará automáticamente al guardar.</div>
          </div>

          <div className="col-md-5">
            <label className="form-label">Cliente (opcional)</label>
            <SearchSelect
              value={clienteId ?? ''}
              placeholder="Buscar cliente..."
              emptyLabel="— Sin cliente —"
              options={clients.map((c) => ({ value: c.id, label: c.nombre }))}
              onChange={(v) => setClienteId(v ? Number(v) : null)}
            />
          </div>

        </div>
      </div>

      {/* Machines */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">Items</h5>
            <div className="d-flex gap-2 align-items-start" style={{ minWidth: 520 }}>
              <div className="flex-grow-1" style={{ minWidth: 420 }}>
                <SearchSelect
                  value={machinePickId}
                  placeholder="Buscar item..."
                  emptyLabel="Agregar item..."
                  options={machines.map((m) => ({ value: m.id, label: `${m.nombre} (${formatUSD(m.total)})` }))}
                  onChange={(v) => setMachinePickId(v ? Number(v) : '')}
                />
              </div>

              <button
                className="btn btn-outline-primary"
                onClick={() => {
                  if (machinePickId) {
                    addMachineLine(Number(machinePickId))
                    setMachinePickId('')
                  }
                }}
              >
                Agregar
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-muted">Sin items todavía.</div>
          ) : (
            items.map((it, idx) => {
              const m = machineById.get(it.machine_base_id)

              return (
                <div key={idx} className="border rounded p-2 mb-2">
                  <div className="row g-2 align-items-end">
                    <div className="col-md-4">
                      <div className="fw-semibold">{m?.nombre ?? `Machine #${it.machine_base_id}`}</div>
                      <div className="text-muted small">Precio sugerido: {formatUSD(m?.total)}</div>
                    </div>

                    <div className="col-md-2">
                      <label className="form-label">Cantidad</label>
                      <input
                        type="number"
                        min={1}
                        className="form-control"
                        value={it.cantidad}
                        onChange={(e) => {
                          const v = Math.max(1, Number(e.target.value))
                          setItems((prev) => {
                            const copy = [...prev]
                            copy[idx] = { ...copy[idx], cantidad: v }
                            return copy
                          })
                        }}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Precio unitario</label>
                      <input
                        className="form-control"
                        value={machinePriceById[it.machine_base_id] ?? machineById.get(it.machine_base_id)?.total ?? '0'}
                        onChange={(e) => {
                          const v = e.target.value
                          setMachinePriceById((prev) => ({ ...prev, [it.machine_base_id]: v }))
                        }}
                      />
                    </div>

                    <div className="col-md-3 text-end">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        Quitar item
                      </button>
                    </div>
                  </div>

                  {/* Accessories */}
                  <div className="mt-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="fw-semibold">Accesorios</div>
                      <div className="d-flex gap-2 align-items-start" style={{ minWidth: 520 }}>
                        <div className="flex-grow-1" style={{ minWidth: 420 }}>
                          <SearchSelect
                            size="sm"
                            value={accessoryPickByLine[idx] ?? ''}
                            placeholder="Buscar accesorio..."
                            emptyLabel="Agregar accesorio..."
                            options={accessories.map((a) => ({ value: a.id, label: `${a.nombre} (${formatUSD(a.total)})` }))}
                            onChange={(v) =>
                              setAccessoryPickByLine((prev) => ({ ...prev, [idx]: v ? Number(v) : '' }))
                            }
                          />
                        </div>

                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => {
                            const picked = accessoryPickByLine[idx]
                            if (picked) {
                              addAccessoryToItem(idx, Number(picked))
                              setAccessoryPickByLine((prev) => ({ ...prev, [idx]: '' }))
                            }
                          }}
                        >
                          Agregar
                        </button>
                      </div>
                    </div>

                    {it.accesorios.length === 0 ? (
                      <div className="text-muted small mt-1">Sin accesorios.</div>
                    ) : (
                      <div className="mt-2">
                        {it.accesorios.map((a, aidx) => {
                          const ad = accessoryById.get(a.accessory_id)
                          return (
                            <div key={aidx} className="row g-2 align-items-end mb-1">
                              <div className="col-md-5">
                                <div className="small">{ad?.nombre ?? `Accessory #${a.accessory_id}`}</div>
                                <div className="text-muted small">Sugerido: {formatUSD(ad?.total)}</div>
                              </div>
                              <div className="col-md-2">
                                <label className="form-label form-label-sm">Qty</label>
                                <input
                                  type="number"
                                  min={1}
                                  className="form-control form-control-sm"
                                  value={a.cantidad}
                                  onChange={(e) => {
                                    const v = Math.max(1, Number(e.target.value))
                                    setItems((prev) => {
                                      const copy = [...prev]
                                      const line = copy[idx]
                                      const accs = [...line.accesorios]
                                      accs[aidx] = { ...accs[aidx], cantidad: v }
                                      copy[idx] = { ...line, accesorios: accs }
                                      return copy
                                    })
                                  }}
                                />
                              </div>
                              <div className="col-md-3">
                                <label className="form-label form-label-sm">Precio unitario</label>
                                <input
                                  className="form-control form-control-sm"
                                  value={accessoryPriceById[a.accessory_id] ?? accessoryById.get(a.accessory_id)?.total ?? '0'}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    setAccessoryPriceById((prev) => ({ ...prev, [a.accessory_id]: v }))
                                  }}
                                />
                              </div>
                              <div className="col-md-2 text-end">
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => {
                                    setItems((prev) => {
                                      const copy = [...prev]
                                      const line = copy[idx]
                                      copy[idx] = { ...line, accesorios: line.accesorios.filter((_, i) => i !== aidx) }
                                      return copy
                                    })
                                  }}
                                >
                                  Quitar
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Logistics */}
      <div className="card mb-3">
        <div className="card-body">
          <h5>Logística</h5>
          <div className="text-muted small mb-2">
            HASTA_ADUANA entra en base imponible. POST_ADUANA suma al total pero no entra en base.
          </div>

          {legs.length === 0 ? (
            <div className="text-muted">Sin logística cargada.</div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Usar</th>
                    <th>Ruta</th>
                    <th>Tipo</th>
                    <th>Etapa</th>
                    <th>Precio unitario</th>
                  </tr>
                </thead>
                <tbody>
                  {legs.map((l) => {
                    const sel = logSel[l.id]
                    const checked = !!sel
                    return (
                      <tr key={l.id}>
                        <td>
                          <input type="checkbox" checked={checked} onChange={() => toggleLeg(l.id)} />
                        </td>
                        <td>
                          {l.desde} → {l.hasta}
                        </td>
                        <td>{l.tipo}</td>
                        <td>
                          <span className={`badge ${l.etapa === 'HASTA_ADUANA' ? 'text-bg-primary' : 'text-bg-secondary'}`}>
                            {l.etapa}
                          </span>
                        </td>
                        <td style={{ width: 200 }}>
                          <input
                            className="form-control form-control-sm"
                            disabled={!checked}
                            value={checked ? sel.total : l.total}
                            onChange={(e) => {
                              const v = e.target.value
                              setLogSel((prev) => ({
                                ...prev,
                                [l.id]: { logistics_leg_id: l.id, total: v, etapa: l.etapa },
                              }))
                            }}
                          />
                          {!checked && <div className="form-text">Sugerido: {formatUSD(l.total)}</div>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* PreTax Charges */}
      <div className="card mb-3">
        <div className="card-body">
          <h5>Costos pre-impuestos</h5>
          <div className="text-muted small mb-2">Se calculan sobre (items + accesorios + logística HASTA_ADUANA) y se suman a la base imponible.</div>

          {pretaxCharges.length === 0 ? (
            <div className="text-muted">Sin costos pre-impuestos cargados.</div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Incluir</th>
                    <th>Nombre</th>
                    <th style={{ width: 180 }}>%</th>
                    <th style={{ width: 260 }}>Aplica a</th>
                    <th style={{ width: 220 }}>Aplicado (U$D)</th>
                  </tr>
                </thead>
                <tbody>
                  {pretaxCharges.map((p) => {
                    const sel = pretaxSel[p.id]
                    const included = sel?.incluido ?? false

                    // base por item: (maquina*cantidad + accesorios)
                    const itemBases = items.map((it) => {
                      const mUnit = toNum(machinePriceById[it.machine_base_id] ?? machineById.get(it.machine_base_id)?.total ?? '0')
                      const mSubtotal = mUnit * it.cantidad
                      const accSubtotal = (it.accesorios || []).reduce((a2, a) => {
                        const aUnit = toNum(accessoryPriceById[a.accessory_id] ?? accessoryById.get(a.accessory_id)?.total ?? '0')
                        return a2 + aUnit * a.cantidad
                      }, 0)
                      return mSubtotal + accSubtotal
                    })

                    const idxs = sel?.apply_to_item_indexes
                    const base =
                      idxs && idxs.length > 0
                        ? (idxs.reduce((acc, i) => acc + (itemBases[i] ?? 0), 0) + calc.logHasta)
                        : calc.basePre

                    const pct = toNum(sel?.porcentaje ?? p.porcentaje) / 100
                    const aplicado = base * pct

                    return (
                      <tr key={p.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={included}
                            onChange={(e) => setPretaxSel((prev) => ({ ...prev, [p.id]: { ...prev[p.id], incluido: e.target.checked } }))}
                          />
                        </td>
                        <td>{p.nombre}</td>
                        <td>
                          <input
                            className="form-control form-control-sm"
                            value={sel?.porcentaje ?? p.porcentaje}
                            onChange={(e) => setPretaxSel((prev) => ({ ...prev, [p.id]: { ...prev[p.id], porcentaje: e.target.value } }))}
                          />
                          <div className="form-text">Sugerido: {p.porcentaje}%</div>
                        </td>
                        <td>
                          <div className="d-flex flex-column gap-1">
                            <select
                              className="form-select form-select-sm"
                              value={sel?.apply_to_item_indexes && sel.apply_to_item_indexes.length > 0 ? 'SOME' : 'ALL'}
                              onChange={(e) => {
                                const mode = e.target.value
                                setPretaxSel((prev) => ({
                                  ...prev,
                                  [p.id]: {
                                    ...prev[p.id],
                                    apply_to_item_indexes: mode === 'SOME' ? [] : undefined,
                                  },
                                }))
                              }}
                              disabled={!included}
                            >
                              <option value="ALL">Todos los ítems</option>
                              <option value="SOME">Seleccionar ítems…</option>
                            </select>

                            {included && sel?.apply_to_item_indexes ? (
                              <div className="border rounded p-2" style={{ maxHeight: 120, overflow: 'auto' }}>
                                {items.map((it, idx) => {
                                  const mbName = machineById.get(it.machine_base_id)?.nombre ?? `Item ${it.machine_base_id}`
                                  const checked = sel.apply_to_item_indexes?.includes(idx) ?? false

                                  return (
                                    <label key={idx} className="d-flex align-items-center gap-2 small mb-1">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(ev) => {
                                          const on = ev.target.checked
                                          setPretaxSel((prev) => {
                                            const cur = prev[p.id]?.apply_to_item_indexes ?? []
                                            const next = on ? Array.from(new Set([...cur, idx])) : cur.filter((x) => x !== idx)
                                            return { ...prev, [p.id]: { ...prev[p.id], apply_to_item_indexes: next } }
                                          })
                                        }}
                                      />
                                      <span>
                                        #{idx + 1} {mbName} (x{it.cantidad})
                                      </span>
                                    </label>
                                  )
                                })}
                                {sel.apply_to_item_indexes.length === 0 ? (
                                  <div className="text-muted small">Elegí al menos 1 ítem o volvé a “Todos”.</div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold">{included ? formatUSD(aplicado) : <span className="text-muted">—</span>}</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Taxes */}
      <div className="card mb-3">
        <div className="card-body">
          <h5>Impuestos</h5>
          <div className="text-muted small mb-2">Se calculan sobre la base imponible (% editable).</div>

          {taxes.length === 0 ? (
            <div className="text-muted">Sin impuestos cargados.</div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Incluir</th>
                    <th>Nombre</th>
                    <th style={{ width: 180 }}>%</th>
                    <th style={{ width: 220 }}>Mínimo (U$D)</th>
                  </tr>
                </thead>
                <tbody>
                  {taxes.map((t) => {
                    const sel = taxSel[t.id]
                    const included = sel?.incluido ?? false
                    const hasMin = t.monto_minimo !== null && t.monto_minimo !== undefined
                    const base = calc.baseImponible
                    const pct = toNum(sel?.porcentaje ?? t.porcentaje) / 100
                    const montoPct = base * pct

                    const minVal = hasMin ? toNum(String(sel?.monto_minimo ?? t.monto_minimo)) : 0
                    const aplicado = hasMin ? Math.max(montoPct, minVal) : montoPct
                    return (
                      <tr key={t.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={included}
                            onChange={(e) => setTaxSel((prev) => ({ ...prev, [t.id]: { ...prev[t.id], incluido: e.target.checked } }))}
                          />
                        </td>
                        <td>{t.nombre}</td>
                        <td>
                          <input
                            className="form-control form-control-sm"
                            value={sel?.porcentaje ?? t.porcentaje}
                            onChange={(e) => setTaxSel((prev) => ({ ...prev, [t.id]: { ...prev[t.id], porcentaje: e.target.value } }))}
                          />
                          <div className="form-text">Sugerido: {t.porcentaje}%</div>
                        </td>
                        <td>
                          {hasMin ? (
                            <>
                              <input
                                className="form-control form-control-sm"
                                value={sel?.monto_minimo ?? t.monto_minimo ?? ''}
                                onChange={(e) =>
                                  setTaxSel((prev) => ({
                                    ...prev,
                                    [t.id]: { ...prev[t.id], monto_minimo: e.target.value },
                                  }))
                                }
                              />
                              <div className="form-text">Sugerido: {t.monto_minimo}</div>
                            </>
                          ) : (
                            <div className="text-muted">—</div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Cargos adicionales */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Cargos adicionales</h5>
            <div className="text-muted small">
              Base: {formatUSD(calc.subtotalMaquinas + calc.subtotalAcc)} · Total cargos: <b>{formatUSD(calc.additionalTotal)}</b>
            </div>
          </div>

          <div className="text-muted small mb-2">
            Se calculan sobre (items + accesorios). Se aplica <b>MAX(% calculado, mínimo)</b>. No afectan base imponible.
          </div>

          {Object.values(additionalSel).length === 0 ? (
            <div className="text-muted">Sin cargos adicionales cargados en catálogo.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Incluir</th>
                    <th>Nombre</th>
                    <th style={{ width: 160 }}>%</th>
                    <th style={{ width: 220 }}>Mínimo (opcional)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(additionalSel)
                    .sort((a, b) => a.nombre.localeCompare(b.nombre))
                    .map((c) => (
                      <tr key={c.additional_charge_id}>
                        <td>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={c.incluido}
                            onChange={(e) =>
                              setAdditionalSel((prev) => ({
                                ...prev,
                                [c.additional_charge_id]: { ...prev[c.additional_charge_id], incluido: e.target.checked },
                              }))
                            }
                          />
                        </td>
                        <td>{c.nombre}</td>
                        <td>
                          <input
                            className="form-control form-control-sm"
                            value={c.porcentaje}
                            onChange={(e) =>
                              setAdditionalSel((prev) => ({
                                ...prev,
                                [c.additional_charge_id]: { ...prev[c.additional_charge_id], porcentaje: e.target.value },
                              }))
                            }
                            disabled={!c.incluido}
                          />
                        </td>
                        <td>
                          <input
                            className="form-control form-control-sm"
                            value={c.monto_minimo ?? ''}
                            onChange={(e) =>
                              setAdditionalSel((prev) => ({
                                ...prev,
                                [c.additional_charge_id]: {
                                  ...prev[c.additional_charge_id],
                                  monto_minimo: e.target.value.trim() ? e.target.value : null,
                                },
                              }))
                            }
                            placeholder="(opcional)"
                            disabled={!c.incluido}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="card mb-3">
        <div className="card-body">
          <h5>Resumen</h5>
          <div className="row g-2">
            <div className="col-md-3">
              <div className="text-muted">Subtotal items</div>
              <div className="fs-5">{formatUSD(calc.subtotalMaquinas)}</div>
            </div>
            <div className="col-md-3">
              <div className="text-muted">Subtotal accesorios</div>
              <div className="fs-5">{formatUSD(calc.subtotalAcc)}</div>
            </div>
            <div className="col-md-3">
              <div className="text-muted">Logística HASTA_ADUANA</div>
              <div className="fs-5">{formatUSD(calc.logHasta)}</div>
            </div>
            <div className="col-md-3">
              <div className="text-muted">Logística POST_ADUANA</div>
              <div className="fs-5">{formatUSD(calc.logPost)}</div>
            </div>

            <div className="col-md-3 mt-3">
              <div className="text-muted">Base pre-impuestos</div>
              <div className="fs-4">{formatUSD(calc.basePre)}</div>
            </div>
            <div className="col-md-3 mt-3">
              <div className="text-muted">Costos pre-impuestos</div>
              <div className="fs-4">{formatUSD(calc.pretaxTotal)}</div>
            </div>
            <div className="col-md-2 mt-3">
              <div className="text-muted">Base imponible</div>
              <div className="fs-4">{formatUSD(calc.baseImponible)}</div>
            </div>
            <div className="col-md-2 mt-3">
              <div className="text-muted">Impuestos</div>
              <div className="fs-4">{formatUSD(calc.impuestos)}</div>
            </div>

            <div className="col-md-2 mt-3">
              <div className="text-muted">Cargos adicionales</div>
              <div className="fs-4">{formatUSD(calc.additionalTotal)}</div>
            </div>

            <div className="col-md-2 mt-3">
              <div className="text-muted">Total</div>
              <div className="fs-4">{formatUSD(calc.total)}</div>
            </div>

          </div>

          <div className="mt-3 d-flex justify-content-end">
            <button className="btn btn-primary" disabled={saving || loadingBudget} onClick={onSave}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar presupuesto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
