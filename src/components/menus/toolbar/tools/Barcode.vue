<template>
  <MenusButton
    :ico="content ? 'edit' : 'barcode'"
    :text="content ? t('tools.barcode.edit') : t('tools.barcode.text')"
    huge
    @menu-click="dialogVisible = true"
  >
    <Modal
      :visible="dialogVisible"
      width="714px"
      @confirm="setBarcode"
      @close="dialogVisible = false"
    >
      <template #header>
        <Icon name="barcode" />
        {{ t('tools.barcode.title') }}
      </template>
      <div class="mxm-barcode-container">
        <div class="mxm-barcode-toolbar">
          <MenusButton
            style="width: 126px"
            :text="t('tools.barcode.format')"
            :select-options="formats"
            menu-type="select"
            :select-value="config.format"
            @menu-click="(value) => (config.format = value)"
          ></MenusButton>
          <TDivider layout="vertical" />
          <MenusButton
            style="width: 114px"
            :text="t('tools.barcode.font')"
            :select-options="fonts"
            menu-type="select"
            :select-value="config.font"
            @menu-click="(value) => (config.font = value)"
          ></MenusButton>
          <TDivider layout="vertical" />
          <MenusToolbarBaseColor
            :text="t('tools.barcode.lineColor')"
            :default-color="config.lineColor"
            modeless
            @change="(value) => (config.lineColor = value)"
          />
          <MenusToolbarBaseBackgroundColor
            :text="t('tools.barcode.bgColor')"
            :default-color="config.background"
            modeless
            @change="(value) => (config.background = value)"
          />
          <TDivider layout="vertical" />
          <MenusToolbarBaseBold
            :menu-active="config.fontOptions.includes('bold')"
            @menu-click-through="changeFontOptions('bold')"
          />
          <MenusToolbarBaseItalic
            :menu-active="config.fontOptions.includes('italic')"
            @menu-click-through="changeFontOptions('italic')"
          />
          <TDivider layout="vertical" />
          <MenusToolbarBaseAlignLeft
            :menu-active="config.textAlign === 'left'"
            @menu-click-through="config.textAlign = 'left'"
          />
          <MenusToolbarBaseAlignCenter
            :menu-active="config.textAlign === 'center'"
            @menu-click-through="config.textAlign = 'center'"
          />
          <MenusToolbarBaseAlignRight
            :menu-active="config.textAlign === 'right'"
            @menu-click-through="config.textAlign = 'right'"
          />
          <TDivider layout="vertical" />
          <MenusButton
            :text="t('tools.barcode.more')"
            menu-type="popup"
            :popup-visible="popupVisible"
            @toggle-popup="togglePopup"
          >
            <Icon name="setting" />
            <template #content>
              <div class="mxm-barcode-toolbar-more">
                <TForm size="small" label-align="left">
                  <TFormItem :label="t('tools.barcode.width')">
                    <TSlider
                      v-model="config.width"
                      :min="1"
                      :max="4"
                      :step="1"
                      :tooltip-props="{
                        showArrow: false,
                        theme: 'light',
                      }"
                    />
                  </TFormItem>
                  <TFormItem :label="t('tools.barcode.height')">
                    <TSlider
                      v-model="config.height"
                      :min="10"
                      :max="200"
                      :step="1"
                      :tooltip-props="{
                        showArrow: false,
                        theme: 'light',
                      }"
                    />
                  </TFormItem>
                  <TFormItem :label="t('tools.barcode.margin')">
                    <TSlider
                      v-model="config.margin"
                      :min="0"
                      :max="25"
                      :step="1"
                      :tooltip-props="{
                        showArrow: false,
                        theme: 'light',
                      }"
                    />
                  </TFormItem>
                  <TDivider></TDivider>
                  <TFormItem :label="t('tools.barcode.displayValue')">
                    <TCheckbox v-model="config.displayValue">
                      {{ t('tools.barcode.displayValueText') }}
                    </TCheckbox>
                  </TFormItem>
                  <TFormItem
                    :label="t('tools.barcode.textContent')"
                    :help="t('tools.barcode.textContentTip')"
                  >
                    <TTextarea
                      v-model="config.text"
                      autosize
                      maxlength="100"
                    />
                  </TFormItem>
                  <TFormItem :label="t('tools.barcode.textPosition')">
                    <TSelect
                      v-model="config.textPosition"
                      :options="textPositions"
                      :popup-props="{
                        destroyOnClose: true,
                        attach: container,
                      }"
                    >
                    </TSelect>
                  </TFormItem>
                  <TFormItem :label="t('tools.barcode.textMargin')">
                    <TSlider
                      v-model="config.textMargin"
                      :min="-15"
                      :max="40"
                      :step="1"
                      :tooltip-props="{
                        showArrow: false,
                        theme: 'light',
                      }"
                    />
                  </TFormItem>
                  <TFormItem :label="t('tools.barcode.fontSize')">
                    <TSlider
                      v-model="config.fontSize"
                      :min="8"
                      :max="36"
                      :step="1"
                      :tooltip-props="{
                        showArrow: false,
                        theme: 'light',
                      }"
                    />
                  </TFormItem>
                </TForm>
              </div>
            </template>
          </MenusButton>
        </div>
        <div class="mxm-barcode-code">
          <TInput
            v-model="config.content"
            maxlength="44"
            show-limit-number
            autofocus
            clearable
            :placeholder="t('tools.barcode.placeholder')"
            :status="renderError && config.content !== '' ? 'error' : 'default'"
          >
            <template #prefixIcon>
              <Icon name="barcode" />
            </template>
          </TInput>
          <div
            v-if="renderError && config.content"
            class="mxm-barcode-error"
            v-text="t('tools.barcode.error')"
          ></div>
        </div>
        <div class="mxm-barcode-render">
          <div
            class="mxm-barcode-title"
            v-text="t('tools.barcode.preview')"
          ></div>
          <div class="mxm-barcode-svg mxm-scrollbar">
            <div
              v-if="renderError"
              class="mxm-barcode-empty"
              v-text="t('tools.barcode.renderError')"
            ></div>
            <svg v-show="!renderError" id="barcode" ref="barcodeSvgRef"></svg>
          </div>
        </div>
      </div>
    </Modal>
  </MenusButton>
</template>

<script setup lang="ts">
import { l, t } from '@/composables/i18n'
import JsBarcode from 'jsbarcode'

import { getSelectionNode } from '@/utils/selection'
import { svgToDataURL } from '@/utils/file'
import { shortId } from '@/utils/short-id'

const { content } = defineProps({
  content: {
    type: String,
    default: '',
  },
})

const { popupVisible, togglePopup } = usePopup()

let dialogVisible = $ref(false)
const container = inject('container')
const editor = inject('editor')
const options = inject('options')

// 工具栏
const formats = [
  { label: 'CODE128', value: 'CODE128' },
  { label: 'CODE128 A', value: 'CODE128A' },
  { label: 'CODE128 B', value: 'CODE128B' },
  { label: 'CODE128 C', value: 'CODE128C' },
  { label: 'EAN13', value: 'EAN13' },
  { label: 'UPC', value: 'UPC' },
  { label: 'CODE39', value: 'CODE39' },
  { label: 'ITF14', value: 'ITF14' },
  { label: 'ITF', value: 'ITF' },
  { label: 'MSI', value: 'MSI' },
  { label: 'MSI10', value: 'MSI10' },
  { label: 'MSI11', value: 'MSI11' },
  { label: 'MSI1010', value: 'MSI1010' },
  { label: 'MSI1110', value: 'MSI1110' },
  { label: 'Pharmacode', value: 'Pharmacode' },
]
const fonts = options.value.dicts?.fonts.map((item) => {
  return {
    label: l(item.label),
    value: item.value || '',
  }
})
const textPositions = [
  { label: t('tools.barcode.bottom'), value: 'bottom' },
  { label: t('tools.barcode.top'), value: 'top' },
]
const defaultConfig = {
  content: '',
  width: 2,
  height: 100,
  font: '',
  format: 'CODE128',
  lineColor: '#000',
  background: '',
  fontOptions: '',
  displayValue: true,
  textAlign: 'center',
  textPosition: 'bottom',
  fontSize: 20,
  textMargin: 2,
  margin: 10,
  text: undefined,
}
let config = $ref({ ...defaultConfig })
let changed = $ref(false)

const changeFontOptions = (val) => {
  let fontOptions = config.fontOptions.split(' ')
  if (fontOptions.includes(val)) {
    fontOptions = fontOptions.filter((item) => item !== val)
  } else {
    fontOptions.push(val)
  }
  config.fontOptions = fontOptions.join(' ').trim()
}

// 生成条形码
let renderError = $ref(false)
const barcodeSvgRef = $ref(null)
const renderBarcode = async () => {
  try {
    await nextTick()
    JsBarcode(`${container} #barcode`, config.content, config)
    renderError = false
  } catch {
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
      renderBarcode()
    }
  },
  { immediate: true, deep: true },
)

// 创建或更新条形码
const setBarcode = () => {
  if (renderError) {
    useMessage('error', {
      attach: container,
      content: t('tools.barcode.renderError'),
    })
    return
  }
  if (config.content === '') {
    useMessage('error', {
      attach: container,
      content: t('tools.barcode.notEmpty'),
    })
    return
  }

  if (changed) {
    const width = barcodeSvgRef?.width?.animVal?.value
    const height = barcodeSvgRef?.height?.animVal?.value
    editor.value
      ?.chain()
      .focus()
      .setImage(
        {
          id: shortId(10),
          type: 'barcode',
          src: svgToDataURL(barcodeSvgRef.outerHTML),
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
.mxm-barcode-container {
  padding: 2px;
  .mxm-barcode-toolbar {
    margin-bottom: 10px;
    display: flex;
    align-items: center;
  }
  .mxm-barcode-code {
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
  .mxm-barcode-render {
    border: solid 1px var(--td-border-level-2-color);
    border-radius: var(--mxm-radius);
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
    .mxm-barcode-title {
      background-color: var(--mxm-button-hover-background);
      padding: 0 10px;
      position: absolute;
      font-size: 12px;
      border-bottom-right-radius: var(--mxm-radius);
    }
    .mxm-barcode-svg {
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      padding: 30px 10px;
      min-height: 100px;
      overflow: auto;
      color: var(--mxm-text-color);
      svg {
        border: solid 1px var(--mxm-border-color-light);
      }
    }
    .mxm-barcode-empty {
      color: var(--mxm-text-color-light);
      font-size: 12px;
      margin: 20px;
    }
  }
}
</style>

<style lang="less">
.barcode-toolbar-more {
  padding: 10px 20px 10px 15px;
  width: 300px;
  .mxm-form__item {
    margin-bottom: 5px;
  }
  .mxm-form__label {
    margin-right: 20px;
  }
  .mxm-divider--horizontal {
    margin: 10px 0;
  }
}
</style>
