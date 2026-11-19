import { getBalances, getSuggestedReimbursements } from './balances'
import { getCurrency } from './currency'
import {
  getExpenseCurrency,
  getExpenseCurrencyCodes,
  groupExpensesByCurrency,
  normalizeExpenseCurrencyCode,
} from './expense-currency'
import { getCurrencyFromGroup } from './utils'

const pesos = getCurrencyFromGroup({ currency: '$', currencyCode: '' })

describe('normalizeExpenseCurrencyCode', () => {
  it('stores the group currency as null', () => {
    expect(normalizeExpenseCurrencyCode(null, '')).toBeNull()
    expect(normalizeExpenseCurrencyCode('', '')).toBeNull()
    expect(normalizeExpenseCurrencyCode(undefined, null)).toBeNull()
    expect(normalizeExpenseCurrencyCode('EUR', 'EUR')).toBeNull()
  })

  it('keeps another currency', () => {
    expect(normalizeExpenseCurrencyCode('USD', '')).toBe('USD')
    expect(normalizeExpenseCurrencyCode('USD', 'EUR')).toBe('USD')
  })
})

describe('getExpenseCurrencyCodes', () => {
  it('offers dollars besides the group currency', () => {
    expect(getExpenseCurrencyCodes('')).toEqual([null, 'USD'])
    expect(getExpenseCurrencyCodes(null)).toEqual([null, 'USD'])
  })

  it('offers only the group currency when it already is dollars', () => {
    expect(getExpenseCurrencyCodes('USD')).toEqual([null])
  })
})

describe('getExpenseCurrency', () => {
  it('is the group currency by default', () => {
    expect(getExpenseCurrency(pesos, null)).toBe(pesos)
    expect(getExpenseCurrency(pesos, '')).toBe(pesos)
  })

  it('tells dollars apart from pesos', () => {
    const dollars = getExpenseCurrency(pesos, 'USD')
    expect(dollars.code).toBe('USD')
    expect(dollars.symbol).toBe('US$')
    expect(dollars.decimal_digits).toBe(2)
  })

  it('is the group currency when the code matches it', () => {
    const usd = getCurrency('USD')
    expect(getExpenseCurrency(usd, 'USD')).toBe(usd)
  })
})

describe('groupExpensesByCurrency', () => {
  const expense = (
    id: string,
    amount: number,
    paidBy: string,
    paidFor: string[],
    currencyCode: string | null = null,
  ) => ({
    id,
    amount,
    currencyCode,
    splitMode: 'EVENLY' as const,
    paidBy: { id: paidBy, name: paidBy },
    paidFor: paidFor.map((id) => ({
      participant: { id, name: id },
      shares: 1,
    })),
  })

  it('always lists the group currency first, even without expenses', () => {
    expect(groupExpensesByCurrency([], '')).toEqual([
      { currencyCode: null, expenses: [] },
    ])
    const usd = expense('1', 1000, 'a', ['a', 'b'], 'USD')
    expect(groupExpensesByCurrency([usd], '')).toEqual([
      { currencyCode: null, expenses: [] },
      { currencyCode: 'USD', expenses: [usd] },
    ])
  })

  it('keeps the balances of each currency apart', () => {
    const expenses = [
      expense('1', 10000_00, 'a', ['a', 'b']), // $ 10.000, paid by A
      expense('2', 100_00, 'b', ['a', 'b'], 'USD'), // US$ 100, paid by B
      expense('3', 2000_00, 'b', ['a', 'b'], ''), // $ 2.000, paid by B
    ]
    const [pesos, dollars] = groupExpensesByCurrency(expenses, '').map(
      ({ currencyCode, expenses }) => ({
        currencyCode,
        reimbursements: getSuggestedReimbursements(
          getBalances(expenses as any),
        ),
      }),
    )

    expect(pesos.currencyCode).toBeNull()
    expect(pesos.reimbursements).toEqual([
      { from: 'b', to: 'a', amount: 4000_00 },
    ])
    expect(dollars.currencyCode).toBe('USD')
    expect(dollars.reimbursements).toEqual([
      { from: 'a', to: 'b', amount: 50_00 },
    ])
  })
})
