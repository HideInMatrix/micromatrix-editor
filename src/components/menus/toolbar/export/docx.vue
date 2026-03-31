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
          <t-form-item label="正文中文字体">
            <t-select v-model="formData.bodyChineseFont" filterable>
              <t-option
                v-for="item in fontOptions"
                :key="`body-zh-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </t-select>
          </t-form-item>
          <t-form-item label="正文英文字体">
            <t-select v-model="formData.bodyWesternFont" filterable>
              <t-option
                v-for="item in fontOptions"
                :key="`body-en-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </t-select>
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
            <t-select v-model="formData.chapterFont" filterable>
              <t-option
                v-for="item in fontOptions"
                :key="`chapter-font-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </t-select>
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
            <t-select v-model="formData.sectionFont" filterable>
              <t-option
                v-for="item in fontOptions"
                :key="`section-font-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </t-select>
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

        <div class="umo-docx-export-grid">
          <t-form-item label="三级标题字体（H3）">
            <t-select v-model="formData.heading3Font" filterable>
              <t-option
                v-for="item in fontOptions"
                :key="`heading3-font-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </t-select>
          </t-form-item>
          <t-form-item label="三级标题字号（H3）">
            <t-select v-model="formData.heading3FontSize">
              <t-option
                v-for="item in fontSizeOptions"
                :key="`h3-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </t-select>
          </t-form-item>
        </div>

        <div class="umo-docx-export-grid">
          <t-form-item label="四级标题字体（H4）">
            <t-select v-model="formData.heading4Font" filterable>
              <t-option
                v-for="item in fontOptions"
                :key="`heading4-font-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </t-select>
          </t-form-item>
          <t-form-item label="四级标题字号（H4）">
            <t-select v-model="formData.heading4FontSize">
              <t-option
                v-for="item in fontSizeOptions"
                :key="`h4-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </t-select>
          </t-form-item>
        </div>

        <div class="umo-docx-export-grid">
          <t-form-item label="五级标题字体（H5）">
            <t-select v-model="formData.heading5Font" filterable>
              <t-option
                v-for="item in fontOptions"
                :key="`heading5-font-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </t-select>
          </t-form-item>
          <t-form-item label="五级标题字号（H5）">
            <t-select v-model="formData.heading5FontSize">
              <t-option
                v-for="item in fontSizeOptions"
                :key="`h5-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </t-select>
          </t-form-item>
        </div>

        <div class="umo-docx-export-grid">
          <t-form-item label="六级标题字体（H6）">
            <t-select v-model="formData.heading6Font" filterable>
              <t-option
                v-for="item in fontOptions"
                :key="`heading6-font-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </t-select>
          </t-form-item>
          <t-form-item label="六级标题字号（H6）">
            <t-select v-model="formData.heading6FontSize">
              <t-option
                v-for="item in fontSizeOptions"
                :key="`h6-${item.value}`"
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
          <li>
            图表标题常见要求为五号宋体，图号/表号通常按章编号，如“图 2-1”“表
            3-2”。
          </li>
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
  { label: '小五（9pt）', value: '9pt' },
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

const fontOptions = computed(() =>
  (options.value.dicts?.fonts || []).map((item) => ({
    label: l(item.label),
    value: item.value || '',
  })),
)

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

const createDefaultForm = () => {
  return {
    bodyChineseFont: 'SimSun',
    bodyWesternFont: 'Times New Roman',
    bodyFontSize: '12pt',
    chapterFont: 'SimHei',
    chapterFontSize: '22pt',
    sectionFont: 'SimHei',
    sectionFontSize: '16pt',
    heading3Font: 'SimHei',
    heading3FontSize: '14pt',
    heading4Font: 'SimHei',
    heading4FontSize: '12pt',
    heading5Font: 'SimHei',
    heading5FontSize: '10.5pt',
    heading6Font: 'SimHei',
    heading6FontSize: '9pt',
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
  const [lineSpacingType, lineSpacingRaw] =
    `${formData.lineSpacingPreset}`.split(':')

  return {
    title: options.value.document?.title,
    page: {
      ...page.value,
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
    defaultFirstLineIndentChars: clampNumber(formData.firstLineIndentChars, 2),
    headingStyles: {
      1: {
        bold: true,
        font: createFontOptions(formData.chapterFont, formData.bodyWesternFont),
        size: formData.chapterFontSize,
      },
      2: {
        bold: true,
        font: createFontOptions(formData.sectionFont, formData.bodyWesternFont),
        size: formData.sectionFontSize,
      },
      3: {
        bold: true,
        font: createFontOptions(
          formData.heading3Font,
          formData.bodyWesternFont,
        ),
        size: formData.heading3FontSize,
      },
      4: {
        bold: true,
        font: createFontOptions(
          formData.heading4Font,
          formData.bodyWesternFont,
        ),
        size: formData.heading4FontSize,
      },
      5: {
        bold: true,
        font: createFontOptions(
          formData.heading5Font,
          formData.bodyWesternFont,
        ),
        size: formData.heading5FontSize,
      },
      6: {
        bold: true,
        font: createFontOptions(
          formData.heading6Font,
          formData.bodyWesternFont,
        ),
        size: formData.heading6FontSize,
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
