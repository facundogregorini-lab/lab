'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Receipt, Scale, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { ComponentType } from 'react'

type Props = {
  groupId: string
}

export function GroupTabs({ groupId }: Props) {
  const t = useTranslations()
  const pathname = usePathname()
  const value =
    pathname.replace(/\/groups\/[^\/]+\/([^/]+).*/, '$1') || 'expenses'
  const router = useRouter()

  const tabs: { value: string; label: string; Icon: ComponentType<any> }[] = [
    { value: 'expenses', label: t('Expenses.title'), Icon: Receipt },
    { value: 'balances', label: t('Balances.title'), Icon: Scale },
    { value: 'edit', label: t('Settings.title'), Icon: Settings },
  ]

  return (
    <Tabs
      value={value}
      className="[&>*]:border flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onValueChange={(value) => {
        router.push(`/groups/${groupId}/${value}`)
      }}
    >
      <TabsList>
        {tabs.map(({ value, label, Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            title={label}
            aria-label={label}
            className="gap-2"
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
