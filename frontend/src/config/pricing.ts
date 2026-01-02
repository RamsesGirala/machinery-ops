// Reglas de sugerencia de precios (fácil de modificar)
//
// Nota: los cálculos están del lado del front porque es una "sugerencia" de UI.
// El back solo persiste el monto final que confirmes.

export const SALE_MARGIN_PCT = 0.25 // +25% sobre el costo
export const RENTAL_MONTHLY_RATE_PCT = 0.05 // 5% del costo por mes

export function suggestSaleTotal(cost: number): number {
  return cost * (1 + SALE_MARGIN_PCT)
}

export function suggestMonthlyRent(cost: number): number {
  return cost * RENTAL_MONTHLY_RATE_PCT
}
