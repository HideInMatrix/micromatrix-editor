<template>
  <MenusButton
    ico="chinese-case"
    :text="t('tools.chineseCase.text')"
    :tooltip="t('tools.chineseCase.tip')"
    menu-type="dropdown"
    huge
    overlay-class-name="mxm-chinese-case-dropdown"
  >
    <template #dropmenu>
      <TDropdownMenu>
        <TDropdownItem
          v-for="item in options"
          :key="item.value"
          :value="item.value"
          :divider="item.divider"
          @click="setChineseCase(item.fn)"
        >
          <div class="label">{{ item.label }}</div>
          <div class="desc">{{ item.desc }}</div>
        </TDropdownItem>
      </TDropdownMenu>
    </template>
  </MenusButton>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
import nzh from 'nzh/cn'

import { getSelectionText } from '@/utils/selection'

const editor = inject('editor')
const container = inject('container')

const options = [
  {
    value: 'money-uppercase',
    label: '数字小写金额 → 中文大写金额',
    desc: '人民币伍佰肆拾叁元贰角壹分',
    fn(text) {
      const number = text
        .toString()
        .replaceAll(',', '')
        .replaceAll('￥', '')
        .replaceAll(' ', '')
      return nzh.toMoney(number, { unOmitYuan: true, forceZheng: true })
    },
  },
  {
    value: 'number-to-lowercase',
    label: '阿拉伯数字 → 中文小写',
    desc: '十万零一百一十一',
    fn: (text) => nzh.encodeS(text),
  },
  {
    value: 'scientific-to-lowercase',
    label: '科学记数法 → 中文小写',
    desc: '1.23456789e+21',
    fn: (text) => nzh.encodeS(text),
    divider: true,
  },
  {
    value: 'money-to-number',
    label: '中文大写金额 → 数字小写金额',
    desc: '￥54,321.00',
    fn(text) {
      const char = text
        .replaceAll('人民币', '')
        .replaceAll('元', '')
        .replaceAll('整', '')
      const amount = nzh.decodeB(char).toString()

      // 使用正则表达式添加千位分隔符
      const parts = amount.split('.')
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      // 如果有小数部分，保留两位小数
      if (parts.length === 2) {
        parts[1] = parts[1].padEnd(2, '0')
      } else {
        parts.push('00')
      }
      // 拼接为金额格式的字符串
      const result = parts.join('.')
      return `￥${result}`
    },
  },
  {
    value: 'lowercase-to-number',
    label: '中文小写 → 阿拉伯数字',
    desc: '54321',
    fn: (text) => nzh.decodeS(text),
  },
]

const setChineseCase = (fn) => {
  if (!editor.value) {
    return
  }
  const text = getSelectionText(editor.value)
  if (text === '') {
    useMessage('error', {
      attach: container,
      content: '请先选中要转换的文本',
    })
    return
  }
  try {
    const content = fn(text)
    editor.value.chain().focus().insertContent(content.toString()).run()
  } catch {
    useMessage('error', {
      attach: container,
      content: '大小写转化失败，请检查当前选中的文本',
    })
  }
}
</script>

<style lang="less">
.mxm-chinese-case-dropdown {
  .mxm-dropdown__item {
    max-width: unset !important;
    &-text {
      padding: 5px;
      .label {
        font-size: 14px;
        color: var(--mxm-text-color);
      }
      .desc {
        color: var(--mxm-text-color-light);
        margin-top: -3px;
      }
    }
  }
}
</style>
