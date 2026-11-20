import { Currency } from '@/lib/currency'
import { ParticipantSpending } from '@/lib/totals'
import { formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'

type Props = {
  total: number
  spending: ParticipantSpending[]
  currency: Currency
}

/** What a currency's expenses add up to, and what each participant paid and owed. */
export function SpendingTotals({ total, spending, currency }: Props) {
  const locale = useLocale()
  const t = useTranslations('Balances.Totals')
  const money = (amount: number) => formatCurrency(currency, amount, locale)

  return (
    <div className="text-sm">
      <div className="flex justify-between items-baseline py-2">
        <span>{t('total')}</span>
        <strong className="text-lg tabular-nums" data-testid="spending-total">
          {money(total)}
        </strong>
      </div>
      {spending.map(({ participantId, name, paid, share }) => (
        <div
          key={participantId}
          data-testid="spending-row"
          data-participant={name}
          className="flex justify-between items-baseline gap-2 py-1 border-t"
        >
          <span>{name}</span>
          <span className="text-muted-foreground text-right tabular-nums">
            {t('paid')} <span className="text-foreground">{money(paid)}</span>
            {' · '}
            {t('share')} <span className="text-foreground">{money(share)}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
