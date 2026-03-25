import DialogPlugin from 'tdesign-vue-next/esm/dialog/plugin'
import MessagePlugin from 'tdesign-vue-next/esm/message/plugin'

import { t } from '@/composables/i18n'

export function useAlert(params) {
  return DialogPlugin.alert({
    placement: 'center',
    ...params,
  })
}
export function useConfirm(params) {
  return DialogPlugin.confirm({
    placement: 'center',
    preventScrollThrough: false,
    cancelBtn: t('dialog.cancel'),
    ...params,
  })
}
export function useMessage(type, params) {
  const messageOptions =
    typeof params === 'string' ? { content: params } : params
  return MessagePlugin[type]?.(messageOptions)
}

export { DialogPlugin, MessagePlugin }
