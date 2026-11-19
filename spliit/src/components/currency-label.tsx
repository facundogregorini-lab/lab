'use client'

import { Locale } from '@/i18n/request'
import { Currency, getCurrency } from '@/lib/currency'
import { getExpenseCurrency } from '@/lib/expense-currency'
import { useLocale, useTranslations } from 'next-intl'

/**
 * Returns a function naming the currencies an expense of the group can be in,
 * e.g. "Pesos ($)" for the group's own currency and "Dólares (US$)".
 */
export function useExpenseCurrencyLabel(groupCurrency: Currency | undefined) {
  const t = useTranslations('Currencies')
  const locale = useLocale() as Locale

  return (currencyCode: string | null | undefined) => {
    if (!groupCurrency) return ''
    const currency = getExpenseCurrency(groupCurrency, currencyCode)
    let name: string | null
    if (currency.code === 'USD' && currency !== groupCurrency) {
      name = t('USD')
    } else if (currency.code) {
      const localName = getCurrency(currency.code, locale).name
      name = localName.charAt(0).toUpperCase() + localName.slice(1)
    } else {
      // A custom currency: the default one, "$", is the Argentine peso.
      name = currency.symbol === '$' ? t('pesos') : null
    }
    return name
      ? t('label', { name, symbol: currency.symbol })
      : currency.symbol
  }
}
