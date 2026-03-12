<template>
  <ToolbarScrollable ref="scrollableRef" class="mxm-scrollable-container">
    <div class="mxm-classic-menu">
      <div v-if="menus.length > 1" class="mxm-virtual-group">
        <TSelect
          v-if="selectVisible"
          v-model="currentMenu"
          :popup-props="{
            destroyOnClose: true,
            attach: container,
          }"
          size="small"
          auto-width
          borderless
          @change="toggoleMenu"
        >
          <template #prefixIcon>
            <Icon name="menu" />
          </template>
          <TOption
            v-for="item in menus"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </TSelect>
      </div>
      <template v-if="currentMenu === 'base'">
        <div class="mxm-virtual-group">
          <MenusToolbarBaseUndo />
          <MenusToolbarBaseRedo />
          <MenusToolbarBaseFormatPainter />
          <MenusToolbarBaseClearFormat />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarBaseHeading />
          <MenusToolbarBaseFontFamily borderless />
          <MenusToolbarBaseFontSize borderless />
          <MenusToolbarBaseWordWrap />
          <MenusToolbarBaseBold />
          <MenusToolbarBaseItalic />
          <MenusToolbarBaseUnderline />
          <MenusToolbarBaseStrike />
          <MenusToolbarBaseSubscript />
          <MenusToolbarBaseSuperscript />
          <MenusToolbarBaseColor />
          <MenusToolbarBaseBackgroundColor />
          <MenusToolbarBaseHighlight v-if="!disableMenu('highlight')" />
          <MenusToolbarBaseLetterSpacing />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarBaseOrderedList />
          <MenusToolbarBaseBulletList />
          <MenusToolbarBaseTaskList v-if="!disableMenu('task-list')" />
          <MenusToolbarBaseIndent />
          <MenusToolbarBaseOutdent />
          <MenusToolbarBaseLineHeight v-if="!disableMenu('line-height')" />
          <MenusToolbarBaseMargin v-if="!disableMenu('margin')" />
          <MenusToolbarBaseAlignDropdown />
          <MenusToolbarBaseCode v-if="!disableMenu('code')" />
          <MenusToolbarBaseQuote v-if="!disableMenu('quote')" />
          <MenusToolbarBaseSelectAll v-if="!disableMenu('select-all')" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarBaseMarkdown v-if="!disableMenu('markdown')" />
          <MenusToolbarBaseSearchReplace />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarBasePrint v-if="!disableMenu('print')" />
        </div>
        <div class="virtual-group is-slot">
          <slot name="toolbar_base" toolbar-mode="classic" />
        </div>
      </template>
      <template v-if="currentMenu === 'insert'">
        <div class="mxm-virtual-group">
          <MenusToolbarInsertLink v-if="!disableMenu('link')" />
          <MenusToolbarInsertImage v-if="!disableMenu('image')" />
          <MenusToolbarInsertVideo v-if="!disableMenu('video')" />
          <MenusToolbarInsertAudio v-if="!disableMenu('audio')" />
          <MenusToolbarInsertFile v-if="!disableMenu('file')" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarInsertTextBox v-if="!disableMenu('text-box')" />
          <MenusToolbarInsertDetails v-if="!disableMenu('details')" />
          <MenusToolbarInsertCodeBlock v-if="!disableMenu('code-block')" />
          <MenusToolbarInsertSymbol v-if="!disableMenu('symbol')" />
          <MenusToolbarInsertChineseDate
            v-if="!disableMenu('chinese-date')"
          />
          <MenusToolbarInsertEmoji v-if="!disableMenu('emoji')" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarInsertTag v-if="!disableMenu('tag')" />
          <MenusToolbarInsertColumns v-if="!disableMenu('columns')" />
          <MenusToolbarInsertCallout v-if="!disableMenu('callout')" />
          <MenusToolbarInsertMention v-if="!disableMenu('mention')" />
          <MenusToolbarInsertOptionBox v-if="!disableMenu('option-box')" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarInsertHardBreak v-if="!disableMenu('hard-break')" />
          <MenusToolbarInsertHr v-if="!disableMenu('hr')" />
          <MenusToolbarInsertBookmark v-if="!disableMenu('bookmark')" />
          <MenusToolbarInsertFootnote v-if="!disableMenu('footnote')" />
          <MenusToolbarInsertToc v-if="!disableMenu('toc')" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarInsertTemplate v-if="!disableMenu('template')" />
          <MenusToolbarInsertWebPage v-if="!disableMenu('web-page')" />
        </div>
        <div class="virtual-group is-slot">
          <slot name="toolbar_insert" toolbar-mode="ribbon" />
        </div>
      </template>
      <template v-if="currentMenu === 'table'">
        <div class="mxm-virtual-group">
          <MenusToolbarTableInsert />
          <MenusToolbarTableFix />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarTableCellsAlign />
          <MenusToolbarTableCellsBackground />
          <!-- <MenusToolbarTableBorderColor /> -->
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarTableAddRowBefore :huge="false" />
          <MenusToolbarTableAddRowAfter :huge="false" />
          <MenusToolbarTableAddColumnBefore :huge="false" />
          <MenusToolbarTableAddColumnAfter :huge="false" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarTableDeleteRow :huge="false" />
          <MenusToolbarTableDeleteColumn :huge="false" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarTableMergeCells :huge="false" />
          <MenusToolbarTableSplitCell :huge="false" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarTableToggleHeaderRow :huge="false" />
          <MenusToolbarTableToggleHeaderColumn :huge="false" />
          <MenusToolbarTableToggleHeaderCell :huge="false" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarTableNextCell :huge="false" />
          <MenusToolbarTablePreviousCell :huge="false" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarTableDelete />
        </div>
        <div class="virtual-group is-slot">
          <slot name="toolbar_table" toolbar-mode="classic" />
        </div>
      </template>
      <template v-if="currentMenu === 'tools'">
        <div class="mxm-virtual-group">
          <MenusToolbarToolsQrcode v-if="!disableMenu('qrcode')" />
          <MenusToolbarToolsBarcode v-if="!disableMenu('barcode')" />
          <MenusToolbarToolsSignature v-if="!disableMenu('signature')" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarToolsMath v-if="!disableMenu('math')" />
          <MenusToolbarToolsDiagrams v-if="!disableMenu('diagrams')" />
          <MenusToolbarToolsEcharts v-if="!disableMenu('echarts')" />
          <!-- <MenusToolbarToolsMindMap v-if="!disableMenu('mind-map')" /> -->
          <MenusToolbarToolsMermaid v-if="!disableMenu('mermaid')" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarToolsChineseCase
            v-if="!disableMenu('chinese-case')"
          />
        </div>
        <div class="virtual-group is-slot">
          <slot name="toolbar_tools" toolbar-mode="classic" />
        </div>
      </template>
      <template v-if="currentMenu === 'page'">
        <div class="mxm-virtual-group">
          <MenusToolbarPageMargin />
          <MenusToolbarPageSize v-if="page.layout === 'page'" />
          <MenusToolbarPageOrientation v-if="page.layout === 'page'" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarPageBreak />
          <MenusToolbarPageBreakMarks />
          <MenusToolbarPageLineNumber />
          <MenusToolbarPageWatermark v-if="!disableMenu('watermark')" />
          <MenusToolbarPageBackground v-if="!disableMenu('background')" />
        </div>
        <div class="virtual-group is-slot">
          <slot name="toolbar_page" toolbar-mode="classic" />
        </div>
      </template>
      <template v-if="currentMenu === 'view'">
        <div class="mxm-virtual-group">
          <MenusToolbarViewToc v-if="!disableMenu('toc')" />
          <MenusToolbarViewFullscreen v-if="!disableMenu('fullscreen')" />
          <MenusToolbarViewPreview v-if="!disableMenu('preview')" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarViewPage v-if="!disableMenu('layout-page')" />
          <MenusToolbarViewWeb v-if="!disableMenu('layout-web')" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarViewZoom v-if="!disableMenu('zoom')" />
          <MenusToolbarViewZoomOriginal
            v-if="!disableMenu('zoom-original')"
          />
          <MenusToolbarViewZoomAuto v-if="!disableMenu('zoom-auto')" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarViewSkin v-if="!disableMenu('skin')" />
          <MenusToolbarViewTheme v-if="!disableMenu('theme')" />
          <MenusToolbarViewLocale v-if="!disableMenu('locale')" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarViewReset v-if="!disableMenu('reset')" />
        </div>
        <div class="virtual-group is-slot">
          <slot name="toolbar_view" toolbar-mode="classic" />
        </div>
      </template>
      <template v-if="currentMenu === 'export'">
        <div class="mxm-virtual-group">
          <MenusToolbarExportImage v-if="!disableMenu('export-image')" />
          <MenusToolbarExportPdf v-if="!disableMenu('export-pdf')" />
          <MenusToolbarExportText v-if="!disableMenu('export-text')" />
        </div>
        <div class="mxm-virtual-group">
          <MenusToolbarExportShare v-if="!disableMenu('share')" />
          <MenusToolbarExportEmbed v-if="!disableMenu('embed')" />
        </div>
        <div class="virtual-group is-slot">
          <slot name="toolbar_export" toolbar-mode="classic" />
        </div>
      </template>
    </div>
  </ToolbarScrollable>
</template>

<script setup lang="ts">
type ToolbarMenu = {
  label: string
  value: string
}

const props = withDefaults(
  defineProps<{
    menus?: ToolbarMenu[]
    currentMenu?: string
  }>(),
  {
    menus: () => [],
    currentMenu: '',
  },
)

const { selectVisible } = useSelect()

const emits = defineEmits(['menu-change'])

const container = inject('container')
const options = inject('options')
const page = inject('page')
const disableMenu = (name) => {
  return options.value.disableExtensions.includes(name)
}

// eslint-disable-next-line vue/no-dupe-keys
let currentMenu = $ref('')
watch(
  () => props.currentMenu,
  async (val) => {
    currentMenu = val
    await nextTick()
    scrollableRef?.update()
  },
  { immediate: true },
)
const scrollableRef = $ref(null)
const toggoleMenu = async (menu) => {
  emits('menu-change', menu)
  await nextTick()
  scrollableRef?.update()
}
</script>

<style lang="less" scoped>
.mxm-scrollable-container {
  padding: 10px;
}
.mxm-classic-menu {
  display: inline-flex;
  align-items: center;
  &:last-child {
    margin-right: 10px;
  }
  .mxm-virtual-group {
    display: flex;
    align-items: center;
    &:empty {
      display: none;
    }
    &:not(:last-child),
    &.is-slot {
      &::before {
        content: '';
        display: block;
        height: 18px;
        width: 1px;
        background-color: var(--mxm-border-color-light);
        margin: 0 10px;
      }
    }
    &:first-child::before {
      display: none;
    }
    :deep(.mxm-menu-button .mxm-button--shape-square) {
      .mxm-icon {
        font-size: 14px;
      }
    }
    &-row {
      display: flex;
    }
  }
}
</style>
