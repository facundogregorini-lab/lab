'use server'

import { Locale } from '@/i18n/request'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'NEXT_LOCALE'
const APP_LOCALE: Locale = 'es'

export async function getUserLocale() {
  // Prio 1: use existing cookie (set by the language switcher)
  // Prio 2: Spanish
  return (await cookies()).get(COOKIE_NAME)?.value ?? APP_LOCALE
}

export async function setUserLocale(locale: Locale) {
  ;(await cookies()).set(COOKIE_NAME, locale)
}
