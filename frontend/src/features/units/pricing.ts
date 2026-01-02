export const SELL_MARKUP_PCT = 0.30        // +30% sobre costo
export const RENT_MONTHLY_PCT = 0.05       // 5% del costo por mes

export function suggestSellPrice(cost: number): number {
  return Math.round(cost * (1 + SELL_MARKUP_PCT))
}

export function suggestMonthlyRent(cost: number): number {
  return Math.round(cost * RENT_MONTHLY_PCT)
}