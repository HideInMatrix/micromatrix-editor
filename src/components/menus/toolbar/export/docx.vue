<template>
  <menus-button
    ico="file"
    :text="t('export.docx.text')"
    huge
    :disabled="loading"
    @menu-click="openDialog"
  />
  <modal
    :visible="dialogVisible"
    width="720px"
    destroy-on-close
    :confirm-btn="{
      content: '导出 Word',
      loading,
    }"
    @confirm="saveDocxFile"
    @close="dialogVisible = false"
  >
    <template #header>
      <icon name="file" />
      Word 导出设置
    </template>
    <div class="umo-docx-export">
      <div class="umo-docx-export-tip">
        已按常见毕业论文格式预设，你可以在导出前按学校或单位要求微调。
      </div>
      <div class="umo-docx-export-toolbar">
        <t-button variant="outline" size="small" @click="resetForm">
          恢复论文默认值
        </t-button>
      </div>
      <t-form :data="formData" label-align="top">
        <div class="umo-docx-export-grid">
          <t-form-item label="纸张大小">
            <t-select v-model="formData.pageSizeIndex">
              <t-option
                v-for="(item, index) in pageSizes"
                :key="index"
                :label="`${l(item.label)} (${item.width} × ${item.height} cm)`"
                :value="index"
              />
            </t-select>
          </t-form-item>
          <t-form-item label="页面方向">
            <t-radio-group v-model="formData.orientation" variant="default-filled">
              <t-radio-button value="portrait">纵向</t-radio-button>
              <t-radio-button value="landscape">横向</t-radio-button>
            </t-radio-group>
          </t-form-item>
        </div>

        <t-form-item label="页边距（cm）">
          <div class="umo-docx-export-grid margin">
            <t-input-number
              v-model="formData.marginTop"
              :min="0"
              :step="0.1"
              theme="normal"
              align="center"
            />
            <t-input-number
              v-model="formData.marginRight"
              :min="0"
              :step="0.1"
              theme="normal"
              align="center"
            />
            <t-input-number
              v-model="formData.marginBottom"
              :min="0"
              :step="0.1"
              theme="normal"
              align="center"
            />
            <t-input-number
              v-model="formData.marginLeft"
              :min="0"
              :step="0.1"
              theme="normal"
              align="center"
            />
          </div>
          <div class="umo-docx-export-grid margin-label">
            <span>上边距</span>
            <span>右边距</span>
            <span>下边距</span>
            <span>左边距</span>
          </div>
        </t-form-item>

        <div class="umo-docx-export-grid">
          <t-form-item label="正文中文字体">
            <t-input
              v-model.trim="formData.bodyChineseFont"
              placeholder="例如：宋体"
            />
          </t-form-item>
          <t-form-item label="正文英文字体">
            <t-input
              v-model.trim="formData.bodyWesternFont"
              placeholder="例如：Times New Roman"
            />
          </t-form-item>
        </div>

        <div class="umo-docx-export-grid">
          <t-form-item label="正文字号">
            <t-select v-model="formData.bodyFontSize">
              <t-option
                v-for="item in fontSizeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </t-select>
          </t-form-item>
          <t-form-item label="段落行距">
            <t-select v-model="formData.lineSpacingPreset">
              <t-option
                v-for="item in lineSpacingOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </t-select>
          </t-form-item>
        </div>

        <div class="umo-docx-export-grid">
          <t-form-item label="章标题字体（H1）">
            <t-input
              v-model.trim="formData.chapterFont"
              placeholder="例如：黑体"
            />
          </t-form-item>
          <t-form-item label="章标题字号（H1）">
            <t-select v-model="formData.chapterFontSize">
              <t-option
                v-for="item in fontSizeOptions"
                :key="`h1-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </t-select>
          </t-form-item>
        </div>

        <div class="umo-docx-export-grid">
          <t-form-item label="节标题字体（H2）">
            <t-input
              v-model.trim="formData.sectionFont"
              placeholder="例如：黑体"
            />
          </t-form-item>
          <t-form-item label="节标题字号（H2）">
            <t-select v-model="formData.sectionFontSize">
              <t-option
                v-for="item in fontSizeOptions"
                :key="`h2-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </t-select>
          </t-form-item>
        </div>

        <t-form-item label="首行缩进（字符）">
          <t-input-number
            v-model="formData.firstLineIndentChars"
            :min="0"
            :step="0.5"
            theme="normal"
            align="center"
          />
        </t-form-item>
      </t-form>

      <div class="umo-docx-export-note">
        <div class="umo-docx-export-note-title">论文规范提醒</div>
        <ul>
          <li>正文默认按“小四号宋体 + Times New Roman”导出，可在上方调整。</li>
          <li>图表标题常见要求为五号宋体，图号/表号通常按章编号，如“图 2-1”“表 3-2”。</li>
          <li>公式通常居中排版，编号右对齐，例如“（3-5）”。</li>
          <li>参考文献通常采用 GB/T 7714 顺序编码制。</li>
          <li>
            当前导出会保留文档中已有标题、图表、公式和参考文献内容，但不会自动生成图表编号、公式编号或
            GB/T 7714 条目。
          </li>
        </ul>
      </div>
    </div>
  </modal>
</template>

<script setup>
import { saveAs } from 'file-saver'

const container = inject('container')
const options = inject('options')
const page = inject('page')
const exportDocxDocument = inject('exportDocxDocument', null)

const fontSizeOptions = [
  { label: '五号（10.5pt）', value: '10.5pt' },
  { label: '小四（12pt）', value: '12pt' },
  { label: '四号（14pt）', value: '14pt' },
  { label: '三号（16pt）', value: '16pt' },
  { label: '小二（18pt）', value: '18pt' },
  { label: '二号（22pt）', value: '22pt' },
]

const lineSpacingOptions = [
  { label: '1.5 倍行距', value: 'multiple:1.5' },
  { label: '固定 20 磅', value: 'exact:20' },
]

const pageSizes = computed(() => options.value.dicts?.pageSizes || [])

let dialogVisible = $ref(false)
let loading = $ref(false)
let formData = $ref({})

const clampNumber = (value, fallback, min = 0) => {
  const numeric = Number.parseFloat(`${value}`)
  if (!Number.isFinite(numeric)) {
    return fallback
  }
  return Math.max(min, numeric)
}

const createFontOptions = (eastAsia, western) => {
  const zhFont = `${eastAsia || ''}`.trim()
  const enFont = `${western || ''}`.trim()
  const fallback = enFont || zhFont

  if (!fallback) {
    return undefined
  }

  return {
    ascii: enFont || fallback,
    eastAsia: zhFont || fallback,
    hAnsi: enFont || fallback,
  }
}

const getCurrentPageSizeIndex = () => {
  const currentSize = page.value?.size
  const currentIndex = pageSizes.value.findIndex(
    (item) =>
      Number(item.width) === Number(currentSize?.width) &&
      Number(item.height) === Number(currentSize?.height),
  )

  if (currentIndex >= 0) {
    return currentIndex
  }

  const defaultIndex = pageSizes.value.findIndex((item) => item.default)
  return defaultIndex >= 0 ? defaultIndex : 0
}

const createDefaultForm = () => {
  return {
    pageSizeIndex: getCurrentPageSizeIndex(),
    orientation:
      page.value?.orientation || options.value.page?.defaultOrientation || 'portrait',
    marginTop: 2.5,
    marginRight: 2.5,
    marginBottom: 2.5,
    marginLeft: 2.5,
    bodyChineseFont: '宋体',
    bodyWesternFont: 'Times New Roman',
    bodyFontSize: '12pt',
    chapterFont: '黑体',
    chapterFontSize: '22pt',
    sectionFont: '黑体',
    sectionFontSize: '16pt',
    lineSpacingPreset: 'multiple:1.5',
    firstLineIndentChars: 2,
  }
}

const resetForm = () => {
  formData = createDefaultForm()
}

const openDialog = () => {
  resetForm()
  dialogVisible = true
}

const buildExportOptions = () => {
  const [lineSpacingType, lineSpacingRaw] = `${formData.lineSpacingPreset}`.split(
    ':',
  )
  const selectedPageSize =
    pageSizes.value[Number(formData.pageSizeIndex)] || page.value?.size

  return {
    title: options.value.document?.title,
    page: {
      ...page.value,
      size: selectedPageSize,
      orientation: formData.orientation,
      margin: {
        top: clampNumber(formData.marginTop, 2.5),
        right: clampNumber(formData.marginRight, 2.5),
        bottom: clampNumber(formData.marginBottom, 2.5),
        left: clampNumber(formData.marginLeft, 2.5),
      },
    },
    defaultFontSize: formData.bodyFontSize,
    defaultFonts: createFontOptions(
      formData.bodyChineseFont,
      formData.bodyWesternFont,
    ),
    defaultChineseFont: formData.bodyChineseFont,
    defaultWesternFont: formData.bodyWesternFont,
    defaultParagraphLineSpacingType:
      lineSpacingType === 'exact' ? 'exact' : 'multiple',
    defaultParagraphLineSpacing:
      Number.parseFloat(lineSpacingRaw) ||
      (lineSpacingType === 'exact' ? 20 : 1.5),
    defaultFirstLineIndentChars: clampNumber(
      formData.firstLineIndentChars,
      2,
    ),
    headingStyles: {
      1: {
        bold: true,
        font: createFontOptions(
          formData.chapterFont,
          formData.bodyWesternFont,
        ),
        size: formData.chapterFontSize,
      },
      2: {
        bold: true,
        font: createFontOptions(
          formData.sectionFont,
          formData.bodyWesternFont,
        ),
        size: formData.sectionFontSize,
      },
    },
  }
}

const saveDocxFile = async () => {
  if (!exportDocxDocument || loading) {
    return
  }

  loading = true
  try {
    const blob = await exportDocxDocument(buildExportOptions())
    const { title } = options.value.document
    const filename = title !== '' ? title : t('document.untitled')
    saveAs(blob, `${filename}.docx`)
    dialogVisible = false
  } catch (error) {
    const dialog = useAlert({
      attach: container,
      theme: 'warning',
      header: t('export.docx.error'),
      body: error?.message || t('export.docx.error'),
      onConfirm() {
        dialog.destroy()
      },
    })
  } finally {
    loading = false
  }
}
</script>

<style lang="less" scoped>
.umo-docx-export {
  padding: 2px;

  &-tip {
    color: var(--umo-text-color-light);
    font-size: 12px;
    line-height: 1.6;
    margin-bottom: 10px;
  }

  &-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 10px;
  }

  &-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 12px;

    &.margin {
      gap: 8px;
      margin-bottom: 6px;
    }

    &.margin-label {
      color: var(--umo-text-color-light);
      font-size: 12px;
      line-height: 1.4;
    }
  }

  &-note {
    margin-top: 12px;
    padding: 12px 14px;
    border-radius: var(--umo-radius);
    background: var(--umo-button-hover-background);
    color: var(--umo-text-color-light);
    font-size: 12px;
    line-height: 1.7;

    &-title {
      color: var(--umo-text-color);
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
    }

    ul {
      margin: 0;
      padding-left: 18px;
    }
  }
}
</style>
