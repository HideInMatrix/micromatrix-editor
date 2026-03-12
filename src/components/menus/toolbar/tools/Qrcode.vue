<template>
  <MenusButton
    :ico="content ? 'edit' : 'qrcode'"
    :text="content ? t('tools.qrcode.edit') : t('tools.qrcode.text')"
    huge
    @menu-click="menuClick"
  >
    <Modal
      :visible="dialogVisible"
      width="532px"
      @confirm="setQrcode"
      @close="dialogVisible = false"
    >
      <template #header>
        <Icon name="qrcode" />
        {{ content ? t('tools.qrcode.edit') : t('tools.qrcode.text') }}
      </template>
      <div class="mxm-qrcode-container">
        <div class="mxm-qrcode-toolbar">
          <MenusButton
            style="width: 126px"
            :text="t('tools.qrcode.level')"
            :select-options="levels"
            menu-type="select"
            :select-value="config.ecl"
            @menu-click="
              (value) => {
                config.ecl = value
              }
            "
          />
          <MenusButton
            menu-type="input"
            :tooltip="t('tools.qrcode.paddingTip')"
          >
            <TInputNumber
              v-model="config.padding"
              size="small"
              theme="normal"
              :max="10"
              :min="0"
              :allow-input-over-limit="false"
              placeholder=""
            >
              <template #label>
                <span v-text="t('tools.qrcode.padding')"></span>
              </template>
            </TInputNumber>
          </MenusButton>
          <MenusButton menu-type="input" :tooltip="t('tools.qrcode.widthTip')">
            <TInputNumber
              v-model="config.width"
              size="small"
              theme="normal"
              :max="1024"
              :min="64"
              :allow-input-over-limit="false"
              placeholder=""
            >
              <template #label>
                <span v-text="t('tools.qrcode.width')"></span>
              </template>
            </TInputNumber>
          </MenusButton>
          <TDivider layout="vertical" />
          <MenusToolbarBaseColor
            :text="t('tools.qrcode.color')"
            :default-color="config.color"
            modeless
            @change="(value) => (config.color = value)"
          />
          <MenusToolbarBaseBackgroundColor
            :text="t('tools.qrcode.bgColor')"
            :default-color="config.background"
            modeless
            @change="(value) => (config.background = value)"
          />
        </div>
        <div class="mxm-qrcode-code">
          <TTextarea
            v-model="config.content"
            maxlength="200"
            show-limit-number
            autofocus
            autosize
            :placeholder="t('tools.qrcode.placeholder')"
          >
          </TTextarea>
          <div
            v-if="renderError && config.content !== ''"
            class="mxm-barcode-error"
            v-text="t('tools.qrcode.renderError')"
          ></div>
        </div>
        <div class="mxm-qrcode-render">
          <div
            class="mxm-qrcode-title"
            v-text="t('tools.qrcode.preview')"
          ></div>
          <div class="mxm-qrcode-svg mxm-scrollbar">
            <div
              v-if="!svgCode"
              class="mxm-qrcode-empty"
              v-text="t('tools.qrcode.notEmpty')"
            ></div>
            <div v-else class="mxm-svg-render" v-html="svgCode"></div>
          </div>
        </div>
      </div>
    </Modal>
  </MenusButton>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
import { qrcode } from 'pure-svg-code'

import { getSelectionNode } from '@/utils/selection'
import { svgToDataURL } from '@/utils/file'
import { shortId } from '@/utils/short-id'

const { content } = defineProps({
  content: {
    type: String,
    default: '',
  },
})

let dialogVisible = $ref(false)
const editor = inject('editor')
const container = inject('container')

const menuClick = () => {
  renderQrcode()
  dialogVisible = true
}

const levels = [
  { label: t('tools.qrcode.levelL'), value: 'L' },
  { label: t('tools.qrcode.levelM'), value: 'M' },
  { label: t('tools.qrcode.levelQ'), value: 'Q' },
  { label: t('tools.qrcode.levelH'), value: 'H' },
]
type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'
const defaultConfig = {
  content: '',
  padding: 1,
  width: 256,
  height: 256,
  color: '#000000',
  background: '#ffffff',
  ecl: 'M' as ErrorCorrectionLevel,
}

let config = $ref({ ...defaultConfig })
let changed = $ref(false)

let svgCode = $ref(null)
let renderError = $ref(false)
const renderQrcode = () => {
  try {
    svgCode = null
    config.height = config.width
    svgCode = qrcode(config)
    renderError = false
  } catch {
    svgCode = null
    renderError = true
  }
}
watch(
  () => dialogVisible,
  (val) => {
    if (val) {
      config = content ? JSON.parse(content) : { ...defaultConfig }
      setTimeout(() => {
        changed = false
      }, 200)
    }
  },
  { immediate: true },
)
watch(
  () => config,
  () => {
    if (dialogVisible) {
      changed = true
      renderQrcode()
    }
  },
  { immediate: true, deep: true },
)

// 创建或更新条形码
const setQrcode = () => {
  if (renderError || !svgCode) {
    useMessage('error', {
      attach: container,
      content: t('tools.qrcode.renderError'),
    })
    return
  }
  if (config.content === '') {
    useMessage('error', {
      attach: container,
      content: t('tools.qrcode.notEmpty'),
    })
    return
  }
  if (changed) {
    const { width, height } = config
    const src = svgToDataURL(svgCode)
    editor.value
      ?.chain()
      .focus()
      .setImage(
        {
          id: shortId(10),
          type: 'qrcode',
          src,
          content: JSON.stringify(config),
          width,
          height,
        },
        !!content,
      )
      .run()
  }
  dialogVisible = false
}
</script>

<style lang="less" scoped>
.mxm-qrcode-container {
  padding: 2px;
  .mxm-qrcode-toolbar {
    margin-bottom: 10px;
    display: flex;
    align-items: center;
  }
  .mxm-qrcode-code {
    margin-bottom: 10px;
    :deep(.mxm-textarea__inner) {
      height: 100%;
      resize: none;
    }
    .mxm-barcode-error {
      font-size: 12px;
      color: var(--mxm-error-color);
    }
  }
  .mxm-qrcode-render {
    border: solid 1px var(--td-border-level-2-color);
    border-radius: var(--mxm-radius);
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
    .mxm-qrcode-title {
      background-color: var(--mxm-button-hover-background);
      padding: 0 10px;
      position: absolute;
      font-size: 12px;
      border-bottom-right-radius: var(--mxm-radius);
    }
    .mxm-qrcode-empty {
      color: var(--mxm-text-color-light);
      font-size: 12px;
      margin: 40px;
    }
    .mxm-qrcode-svg {
      box-sizing: border-box;
      padding: 30px 10px;
      min-height: 100px;
      overflow: auto;
      color: var(--mxm-text-color);
      display: flex;
      align-items: center;
      justify-content: center;
      > .mxm-svg-render {
        border: solid 1px var(--mxm-border-color-light);
        :deep(svg) {
          display: block;
          width: 256px;
          height: 256px;
        }
      }
    }
  }
}
</style>
