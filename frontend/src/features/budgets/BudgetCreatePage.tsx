import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createBudget, updateBudget, fetchBudget } from '../../api/budgetsApi'

import { fetchMachines } from '../../api/machinesApi'
import { fetchAccessories } from '../../api/accessoriesApi'
import { fetchLogisticsLegs } from '../../api/logisticsLegsApi'
import { fetchTaxes } from '../../api/taxesApi'

import type { MachineBase, Accessory, LogisticsLeg, Tax } from '../../api/types/models'
import type { BudgetCreatePayload } from '../../api/types/payloads'
import { formatUSD } from '../../utils/money'
import ErrorAlert from '../../components/global/ErrorAlert'

type MachineLine = {
  machine_base_id: number
  cantidad: number
  accesorios: { accessory_id: number; cantidad: number }[]
}

type LogisticsSel = { logistics_leg_id: number; total: string; etapa: string }
type TaxSel = { tax_id: number; incluido: boolean; porcentaje: string; nombre: string }

function toNum(s: string): number {
  const n = Number(String(s ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export default function BudgetCreatePage() {
  const nav = useNavigate()
  const { id } = useParams()

  const isEdit = Boolean(id)
  const budgetId = id ? Number(id) : null

  const [machines, setMachines] = useState<MachineBase[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [legs, setLegs] = useState<LogisticsLeg[]>([])
  const [taxes, setTaxes] = useState<Tax[]>([])

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

  // refs para resetear selects
  const machinePickerRef = useRef<HTMLSelectElement | null>(null)
  const accessoryPickerRefs = useRef<Record<number, HTMLSelectElement | null>>({})

  const machineById = useMemo(() => new Map(machines.map((m) => [m.id, m])), [machines])
  const accessoryById = useMemo(() => new Map(accessories.map((a) => [a.id, a])), [accessories])
  const legById = useMemo(() => new Map(legs.map((l) => [l.id, l])), [legs])

  // 1) Cargar catálogo (siempre)
  useEffect(() => {
    ;(async () => {
      try {
        setError(null)
        const [m, a, l, t] = await Promise.all([
          fetchMachines({ page: 1, pageSize: 200 }),
          fetchAccessories({ page: 1, pageSize: 500 }),
          fetchLogisticsLegs({ page: 1, pageSize: 200 }),
          fetchTaxes({ page: 1, pageSize: 200 }),
        ])

        setMachines(m.results)
        setAccessories(a.results)
        setLegs(l.results)
        setTaxes(t.results)

        // Inicializamos taxSel con todos los impuestos: incluido si siempre_incluir, porcentaje editable
        const init: Record<number, TaxSel> = {}
        for (const tx of t.results) {
          init[tx.id] = {
            tax_id: tx.id,
            incluido: tx.siempre_incluir ? true : false,
            porcentaje: tx.porcentaje,
            nombre: tx.nombre,
          }
        }
        setTaxSel(init)
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
          tsUpdate[tid] = { tax_id: tid, incluido, porcentaje, nombre }
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

    const baseImponible = subtotalMaquinas + subtotalAcc + logHasta

    let impuestos = 0
    for (const tx of Object.values(taxSel)) {
      if (!tx.incluido) continue
      impuestos += baseImponible * (toNum(tx.porcentaje) / 100)
    }

    const total = baseImponible + impuestos + logPost

    return { subtotalMaquinas, subtotalAcc, logHasta, logPost, baseImponible, impuestos, total }
  }, [items, logSel, taxSel, machinePriceById, accessoryPriceById, machineById, accessoryById])

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
      setError('Tenés que agregar al menos 1 máquina.')
      return
    }

    setSaving(true)
    try {
      const payload: BudgetCreatePayload = {
        fecha,
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
        impuestos: Object.values(taxSel).map((t) => ({
          tax_id: t.tax_id,
          incluido: t.incluido,
          porcentaje: t.porcentaje,
        })),
      }

      if (isEdit && budgetId) {
        const updated: any = await updateBudget(budgetId, payload)
        nav(`/budgets/${updated.id}`)
      } else {
        const created: any = await createBudget(payload)
        nav(`/budgets/${created.id}`)
      }
    } catch {
      setError(isEdit ? 'No se pudo editar el presupuesto.' : 'No se pudo crear el presupuesto. Revisá que los datos sean válidos.')
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

        <button className="btn btn-outline-secondary" onClick={() => nav('/budgets')}>
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
          {/* ❌ Número eliminado */}
        </div>
      </div>

      {/* Machines */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">Máquinas</h5>
            <div className="d-flex gap-2">
              <select ref={machinePickerRef} className="form-select" defaultValue="">
                <option value="" disabled>
                  Agregar máquina...
                </option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} ({formatUSD(m.total)})
                  </option>
                ))}
              </select>
              <button
                className="btn btn-outline-primary"
                onClick={() => {
                  const sel = machinePickerRef.current
                  if (sel && sel.value) {
                    addMachineLine(Number(sel.value))
                    sel.value = '' // reset
                  }
                }}
              >
                Agregar
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-muted">Sin máquinas todavía.</div>
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
                        Quitar máquina
                      </button>
                    </div>
                  </div>

                  {/* Accessories */}
                  <div className="mt-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="fw-semibold">Accesorios</div>
                      <div className="d-flex gap-2">
                        <select
                          className="form-select form-select-sm"
                          defaultValue=""
                          ref={(el) => {
                            accessoryPickerRefs.current[idx] = el
                          }}
                        >
                          <option value="" disabled>
                            Agregar accesorio...
                          </option>
                          {accessories.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nombre} ({formatUSD(a.total)})
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => {
                            const sel = accessoryPickerRefs.current[idx]
                            if (sel && sel.value) {
                              addAccessoryToItem(idx, Number(sel.value))
                              sel.value = '' // reset
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
                  </tr>
                </thead>
                <tbody>
                  {taxes.map((t) => {
                    const sel = taxSel[t.id]
                    const included = sel?.incluido ?? false
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
                      </tr>
                    )
                  })}
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
              <div className="text-muted">Subtotal máquinas</div>
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

            <div className="col-md-4 mt-3">
              <div className="text-muted">Base imponible</div>
              <div className="fs-4">{formatUSD(calc.baseImponible)}</div>
            </div>
            <div className="col-md-4 mt-3">
              <div className="text-muted">Impuestos</div>
              <div className="fs-4">{formatUSD(calc.impuestos)}</div>
            </div>
            <div className="col-md-4 mt-3">
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
