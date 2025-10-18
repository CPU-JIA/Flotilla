/**
 * 翻译文件导出
 */

import { zh } from './zh'
import { en } from './en'
import type { Language, Translations } from '@/contexts/language-context'

export const translations: Record<Language, Translations> = {
  zh,
  en,
}

export { zh, en }
