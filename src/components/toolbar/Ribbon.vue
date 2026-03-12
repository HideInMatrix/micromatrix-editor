<template>
  <div class="mxm-ribbon-menu">
    <div v-if="menus.length > 1" class="mxm-ribbon-tabs">
      <div
        v-for="item in menus"
        :key="item.value"
        class="mxm-ribbon-tabs-item"
        :class="{ active: currentMenu === item.value }"
        @click="changeMenu(item.value)"
      >
        {{ item.label }}
      </div>
    </div>
    <ToolbarScrollable ref="scrollableRef" class="mxm-scrollable-container">
      <div class="mxm-ribbon-container">
        <template v-if="currentMenu === 'base'">
          <div class="mxm-virtual-group">
            <div class="mxm-virtual-group-row">
              <MenusToolbarBaseUndo />
              <MenusToolbarBaseRedo />
            </div>
            <div class="mxm-virtual-group-row">
              <MenusToolbarBaseFormatPainter />
              <MenusToolbarBaseClearFormat />
            </div>
          </div>
          <div class="mxm-virtual-group">
            <div class="mxm-virtual-group-row">
              <MenusToolbarBaseFontFamily />
              <MenusToolbarBaseFontSize />
              <MenusToolbarBaseWordWrap />
            </div>
            <div class="mxm-virtual-group-row">
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
          </div>
          <div class="mxm-virtual-group">
            <div class="mxm-virtual-group-row">
              <MenusToolbarBaseOrderedList />
              <MenusToolbarBaseBulletList />
              <MenusToolbarBaseTaskList v-if="!disableMenu('task-list')" />
              <MenusToolbarBaseIndent />
              <MenusToolbarBaseOutdent />
              <MenusToolbarBaseLineHeight
                v-if="!disableMenu('line-height')"
              />
              <MenusToolbarBaseMargin v-if="!disableMenu('margin')" />
            </div>
            <div class="mxm-virtual-group-row">
              <MenusToolbarBaseAlignLeft />
              <MenusToolbarBaseAlignCenter />
              <MenusToolbarBaseAlignRight />
              <MenusToolbarBaseAlignJustify />
              <MenusToolbarBaseAlignDistributed />
              <MenusToolbarBaseCode v-if="!disableMenu('code')" />
              <MenusToolbarBaseQuote v-if="!disableMenu('quote')" />
              <MenusToolbarBaseSelectAll
                v-if="!disableMenu('select-all')"
              />
            </div>
          </div>
          <div class="mxm-virtual-group">
            <MenusToolbarBaseHeading />
          </div>
          <div class="mxm-virtual-group">
            <MenusToolbarBaseMarkdown v-if="!disableMenu('markdown')" />
            <MenusToolbarBaseSearchReplace />
          </div>
          <div class="mxm-virtual-group">
            <MenusToolbarBasePrint v-if="!disableMenu('print')" />
          </div>
          <div class="virtual-group is-slot">
            <slot name="toolbar_base" toolbar-mode="ribbon" />
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
            <MenusToolbarInsertCodeBlock
              v-if="!disableMenu('code-block')"
            />
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
            <MenusToolbarInsertOptionBox
              v-if="!disableMenu('option-box')"
            />
          </div>
          <div class="mxm-virtual-group">
            <MenusToolbarInsertHardBreak
              v-if="!disableMenu('hard-break')"
            />
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
            <div class="mxm-virtual-group-row">
              <MenusToolbarTableAddRowBefore />
              <MenusToolbarTableAddRowAfter />
              <MenusToolbarTableDeleteRow />
            </div>
            <div class="mxm-virtual-group-row">
              <MenusToolbarTableAddColumnBefore />
              <MenusToolbarTableAddColumnAfter />
              <MenusToolbarTableDeleteColumn />
            </div>
          </div>
          <div class="mxm-virtual-group">
            <div class="mxm-virtual-group-row">
              <MenusToolbarTableMergeCells />
            </div>
            <div class="mxm-virtual-group-row">
              <MenusToolbarTableSplitCell />
            </div>
          </div>
          <div class="mxm-virtual-group">
            <div class="mxm-virtual-group-row">
              <MenusToolbarTableToggleHeaderRow />
              <MenusToolbarTableToggleHeaderColumn />
            </div>
            <div class="mxm-virtual-group-row">
              <MenusToolbarTableToggleHeaderCell />
            </div>
          </div>
          <div class="mxm-virtual-group">
            <div class="mxm-virtual-group-row">
              <MenusToolbarTableNextCell />
            </div>
            <div class="mxm-virtual-group-row">
              <MenusToolbarTablePreviousCell />
            </div>
          </div>
          <div class="mxm-virtual-group">
            <MenusToolbarTableDelete />
          </div>
          <div class="virtual-group is-slot">
            <slot name="toolbar_table" toolbar-mode="ribbon" />
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
          <div class="mxm-virtual-group">
            <slot name="toolbar_tools" toolbar-mode="ribbon" />
          </div>
        </template>
        <template v-if="currentMenu === 'page'">
          <div class="mxm-virtual-group">
            <div class="mxm-virtual-group-row">
              <MenusToolbarPageMargin />
              <div>
                <div class="mxm-virtual-group-row">
                  <MenusToolbarPageSize v-if="page.layout === 'page'" />
                </div>
                <div class="mxm-virtual-group-row">
                  <MenusToolbarPageOrientation
                    v-if="page.layout === 'page'"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="mxm-virtual-group">
            <MenusToolbarPageBreak />
            <MenusToolbarPageBreakMarks />
            <MenusToolbarPageLineNumber />
            <MenusToolbarPageWatermark v-if="!disableMenu('watermark')" />
            <MenusToolbarPageBackground v-if="!disableMenu('background')" />
          </div>
          <div class="virtual-group is-slot">
            <slot name="toolbar_page" toolbar-mode="ribbon" />
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
            <slot name="toolbar_view" toolbar-mode="ribbon" />
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
            <slot name="toolbar_export" toolbar-mode="ribbon" />
          </div>
        </template>
      </div>
    </ToolbarScrollable>
  </div>
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
const emits = defineEmits(['menu-change'])

const options = inject('options')
const page = inject('page')
const disableMenu = (name) => {
  return options.value.disableExtensions.includes(name)
}

const scrollableRef = $ref(null)
const changeMenu = async (menu) => {
  emits('menu-change', menu)
  await nextTick()
  if (scrollableRef) {
    scrollableRef.update()
  }
}
</script>

<style lang="less" scoped>
.mxm-ribbon-menu {
  width: 100%;
}
.mxm-ribbon-tabs {
  padding: 10px 10px 0;
  display: flex;
  &-item {
    font-size: var(--mxm-font-size-small);
    margin-right: 25px;
    cursor: pointer;
    display: flex;
    align-items: center;
    flex-direction: column;
    &:hover {
      font-weight: 600;
      &::after {
        display: block;
        content: '';
        height: 3px;
        width: 100%;
        margin-top: 5px;
        background-color: var(--mxm-border-color);
      }
    }
    &.active {
      color: var(--mxm-primary-color);
      font-weight: 600;
      &::after {
        display: block;
        content: '';
        height: 3px;
        width: 100%;
        margin-top: 5px;
        background-color: var(--mxm-primary-color);
        transition: width 0.3s;
      }
      &:hover::after {
        width: 120%;
      }
    }
    @media screen and (max-width: 640px) {
      margin-right: 10px;
    }
  }
}
.mxm-scrollable-container {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
}
.mxm-ribbon-container {
  display: flex;
  height: 56px;
  flex-shrink: 0;
  .mxm-virtual-group {
    padding: 0 20px;
    border-left: solid 1px var(--mxm-border-color-light);
    flex-shrink: 0;
    &:empty {
      display: none;
    }
    &:first-child {
      padding-left: 0;
    }
    &:first-child,
    &.is-slot:empty {
      border-left: none;
    }
    &-row {
      display: flex;
      align-items: center;
      :deep(> *:not(:last-child)) {
        margin-right: 5px;
      }
      &:not(:last-child) {
        margin-bottom: 5px;
      }
    }
  }
}
</style>

<style lang="less">
.mxm-skin-modern .mxm-ribbon-tabs {
  padding: 14px 15px 0 !important;
}
</style>
