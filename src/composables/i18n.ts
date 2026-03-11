import { isRecord } from '@tool-belt/type-predicates'

import { i18n } from '../i18n'

const { global } = i18n

export const { t } = global

export const l = (data): string | undefined => {
  if (typeof data === 'string') {
    return data
  }

  if (isRecord(data)) {
    const localized = data[global.locale.value.replace('-', '_')]
    if (typeof localized === 'string') {
      return localized
    }
  }
}

export const useI18n = () => global
