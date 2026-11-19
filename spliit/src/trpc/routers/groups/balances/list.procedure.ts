import { getGroup, getGroupExpenses } from '@/lib/api'
import {
  getBalances,
  getPublicBalances,
  getSuggestedReimbursements,
} from '@/lib/balances'
import { groupExpensesByCurrency } from '@/lib/expense-currency'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const listGroupBalancesProcedure = baseProcedure
  .input(z.object({ groupId: z.string().min(1) }))
  .query(async ({ input: { groupId } }) => {
    const [group, expenses] = await Promise.all([
      getGroup(groupId),
      getGroupExpenses(groupId),
    ])

    // Each currency keeps its own balances: amounts are never converted.
    const currencies = groupExpensesByCurrency(
      expenses,
      group?.currencyCode,
    ).map(({ currencyCode, expenses }) => {
      const reimbursements = getSuggestedReimbursements(getBalances(expenses))
      return {
        currencyCode,
        balances: getPublicBalances(reimbursements),
        reimbursements,
      }
    })

    // `balances` and `reimbursements` are the group currency's, as before.
    return { ...currencies[0], currencies }
  })
