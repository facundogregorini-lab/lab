'use client'

import { BalancesList } from '@/app/groups/[groupId]/balances-list'
import { ReimbursementList } from '@/app/groups/[groupId]/reimbursement-list'
import { useExpenseCurrencyLabel } from '@/components/currency-label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackPage } from '@/lib/analytics/track-page'
import { getExpenseCurrency } from '@/lib/expense-currency'
import { getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { Fragment, useEffect } from 'react'
import { match } from 'ts-pattern'
import { useCurrentGroup } from '../current-group-context'

export default function BalancesAndReimbursements() {
  const utils = trpc.useUtils()
  const { groupId, group } = useCurrentGroup()
  const { data: balancesData, isLoading: balancesAreLoading } =
    trpc.groups.balances.list.useQuery({
      groupId,
    })
  const t = useTranslations('Balances')

  useEffect(() => {
    // Until we use tRPC more widely and can invalidate the cache on expense
    // update, it's easier and safer to invalidate the cache on page load.
    utils.groups.balances.invalidate()
  }, [utils])

  const isLoading = balancesAreLoading || !balancesData || !group
  const groupCurrency = group ? getCurrencyFromGroup(group) : undefined
  const currencyLabel = useExpenseCurrencyLabel(groupCurrency)
  // Each currency has its own balances; when there is more than one, every
  // section is titled with its currency.
  const currencies = balancesData?.currencies ?? []
  const showCurrencyTitles = currencies.length > 1

  return (
    <>
      <TrackPage path={`/groups/${groupId}/balances`} />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <BalancesLoading participantCount={group?.participants.length} />
          ) : (
            currencies.map(({ currencyCode, balances }) => (
              <section
                key={currencyCode ?? ''}
                data-testid="balances-currency"
                data-currency={currencyCode ?? ''}
                className="[&+&]:mt-6"
              >
                {showCurrencyTitles && (
                  <h3 className="text-sm font-semibold mb-2">
                    {currencyLabel(currencyCode)}
                  </h3>
                )}
                <BalancesList
                  balances={balances}
                  participants={group?.participants}
                  currency={getExpenseCurrency(groupCurrency!, currencyCode)}
                />
              </section>
            ))
          )}
        </CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('Reimbursements.title')}</CardTitle>
          <CardDescription>{t('Reimbursements.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ReimbursementsLoading
              participantCount={group?.participants.length}
            />
          ) : (
            currencies.map(({ currencyCode, reimbursements }) => (
              <section
                key={currencyCode ?? ''}
                data-testid="reimbursements-currency"
                data-currency={currencyCode ?? ''}
                className="[&+&]:mt-6"
              >
                {showCurrencyTitles && (
                  <h3 className="text-sm font-semibold">
                    {currencyLabel(currencyCode)}
                  </h3>
                )}
                <ReimbursementList
                  reimbursements={reimbursements}
                  participants={group?.participants}
                  currency={getExpenseCurrency(groupCurrency!, currencyCode)}
                  currencyCode={currencyCode}
                  groupId={groupId}
                />
              </section>
            ))
          )}
        </CardContent>
      </Card>
    </>
  )
}

const ReimbursementsLoading = ({
  participantCount = 3,
}: {
  participantCount?: number
}) => {
  return (
    <div className="flex flex-col">
      {Array(participantCount - 1)
        .fill(undefined)
        .map((_, index) => (
          <div key={index} className="flex justify-between py-5">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
    </div>
  )
}

const BalancesLoading = ({
  participantCount = 3,
}: {
  participantCount?: number
}) => {
  const barWidth = (index: number) =>
    match(index % 3)
      .with(0, () => 'w-1/3')
      .with(1, () => 'w-2/3')
      .otherwise(() => 'w-full')

  return (
    <div className="grid grid-cols-2 py-1 gap-y-2">
      {Array(participantCount)
        .fill(undefined)
        .map((_, index) =>
          index % 2 === 0 ? (
            <Fragment key={index}>
              <div className="flex items-center justify-end pr-2">
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="self-start">
                <Skeleton className={`h-7 ${barWidth(index)} rounded-l-none`} />
              </div>
            </Fragment>
          ) : (
            <Fragment key={index}>
              <div className="flex items-center justify-end">
                <Skeleton className={`h-7 ${barWidth(index)} rounded-r-none`} />
              </div>
              <div className="flex items-center pl-2">
                <Skeleton className="h-3 w-16" />
              </div>
            </Fragment>
          ),
        )}
    </div>
  )
}
