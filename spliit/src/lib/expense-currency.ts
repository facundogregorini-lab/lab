import { Currency, getCurrency } from './currency'

/**
 * The second currency an expense can be recorded in, besides the group's.
 *
 * Amounts are never converted between the two: an expense in dollars only
 * affects the dollar balances, and is settled with a reimbursement in dollars.
 */
export const EXTRA_CURRENCY_CODE = 'USD'

/**
 * The currency code stored on an expense: `null` for the group currency (which
 * is also what every expense recorded before this feature has), or
 * `EXTRA_CURRENCY_CODE`.
 */
export function normalizeExpenseCurrencyCode(
  currencyCode: string | null | undefined,
  groupCurrencyCode: string | null | undefined,
): string | null {
  if (!currencyCode || currencyCode === groupCurrencyCode) return null
  return currencyCode
}

/** The currency codes an expense of this group can be recorded in, group's first. */
export function getExpenseCurrencyCodes(
  groupCurrencyCode: string | null | undefined,
): (string | null)[] {
  return groupCurrencyCode === EXTRA_CURRENCY_CODE
    ? [null]
    : [null, EXTRA_CURRENCY_CODE]
}

/** The currency an expense amount is in, given the group's currency. */
export function getExpenseCurrency(
  groupCurrency: Currency,
  currencyCode: string | null | undefined,
): Currency {
  const code = normalizeExpenseCurrencyCode(currencyCode, groupCurrency.code)
  if (!code) return groupCurrency
  const currency = getCurrency(code)
  // Pesos are shown as "$", so dollars need a symbol of their own.
  return code === 'USD'
    ? { ...currency, symbol: 'US$', symbol_native: 'US$' }
    : currency
}

/**
 * Splits a group's expenses by the currency they are recorded in, so balances
 * can be computed for each one separately. The group currency always comes
 * first, even without expenses; other currencies only when they have some.
 */
export function groupExpensesByCurrency<
  T extends { currencyCode?: string | null },
>(
  expenses: T[],
  groupCurrencyCode: string | null | undefined,
): { currencyCode: string | null; expenses: T[] }[] {
  const byCurrency = new Map<string | null, T[]>([[null, []]])
  for (const expense of expenses) {
    const code = normalizeExpenseCurrencyCode(
      expense.currencyCode,
      groupCurrencyCode,
    )
    const list = byCurrency.get(code)
    if (list) list.push(expense)
    else byCurrency.set(code, [expense])
  }
  return [...byCurrency].map(([currencyCode, expenses]) => ({
    currencyCode,
    expenses,
  }))
}
