import { getRequestConfig } from 'next-intl/server'
import { routing } from '@/lib/i18n'

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale

  // Ensure that the incoming `locale` is valid
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }

  // Import messages based on locale
  const messages = locale === 'zh'
    ? (await import('@/locales/zh')).default
    : (await import('@/locales/en')).default

  return {
    locale,
    messages,
  }
})
