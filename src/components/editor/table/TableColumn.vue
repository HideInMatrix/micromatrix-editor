<template>
  <Teleport
    v-if="currentTableWrapper && activeOutlineStyle"
    :to="currentTableWrapper"
  >
    <div
      class="mxm-table-column-selection"
      :class="{ 'is-overlay': isSelectionOverlayActive }"
    >
      <div
        class="mxm-table-column-selection-outline"
        :class="{ 'is-column': isColumnSelection }"
        :style="activeOutlineStyle"
      />
    </div>
    <div
      v-if="showColumnMenuHandle && showColumnHandle && handleStyle"
      ref="handleAnchorRef"
      contenteditable="false"
      class="mxm-table-column-handle-anchor"
      :style="handleStyle"
    >
      <TPopup
        :visible="isMenuOpen"
        :attach="attach"
        trigger="click"
        placement="bottom"
        overlay-inner-class-name="mxm-table-quick-popup"
        @visible-change="handlePopupVisibleChange"
      >
        <TButton
          theme="default"
          variant="outline"
          size="small"
          class="mxm-table-column-handle"
          :class="{ active: isMenuOpen }"
          :title="t('table.columnMenu.text')"
          @mousedown.prevent.stop
        >
          <Icon name="menu" class="mxm-table-column-handle-icon" />
        </TButton>
        <template #content>
          <div
            class="mxm-dropdown__menu mxm-dropdown__menu--right mxm-table-quick-menu mxm-table-column-menu"
            @mousedown.prevent.stop
          >
            <div>
              <li
                class="mxm-dropdown__item mxm-dropdown__item--theme-default mxm-dropdown__item--disabled mxm-block-menu-group-name mxm-table-quick-menu-title"
              >
                <span class="mxm-dropdown__item-text">
                  {{ t('table.columnMenu.text') }}
                </span>
              </li>
            </div>
            <div class="mxm-table-column-menu-items">
              <div>
                <li class="mxm-dropdown__item mxm-dropdown__item--theme-default">
                  <span class="mxm-dropdown__item-text">
                    <MenusButton
                      ico="color"
                      :text="t('table.cellTextColor.text')"
                      :tooltip="false"
                      :menu-active="activeColorMenuKind === 'text'"
                      @menu-click="toggleColorPanel('text')"
                    />
                  </span>
                </li>
              </div>
              <div>
                <li class="mxm-dropdown__item mxm-dropdown__item--theme-default">
                  <span class="mxm-dropdown__item-text">
                    <MenusButton
                      ico="table-cells-background"
                      :text="t('table.cellBgColor.text')"
                      :tooltip="false"
                      :menu-active="activeColorMenuKind === 'background'"
                      @menu-click="toggleColorPanel('background')"
                    />
                  </span>
                </li>
              </div>
              <div
                v-if="activeColorMenuKind === 'text'"
                class="mxm-table-quick-menu-panel-wrap"
              >
                <div class="mxm-table-column-menu-panel">
                  <PickerColor default-color="" @change="changeTextColor" />
                </div>
              </div>
              <div
                v-if="activeColorMenuKind === 'background'"
                class="mxm-table-quick-menu-panel-wrap"
              >
                <div class="mxm-table-column-menu-panel">
                  <PickerColor default-color="" @change="changeBackgroundColor" />
                </div>
              </div>
              <div class="mxm-divider mxm-divider--horizontal mxm-table-quick-menu-divider"></div>
              <div>
                <li class="mxm-dropdown__item mxm-dropdown__item--theme-default">
                  <span class="mxm-dropdown__item-text">
                    <MenusButton
                      ico="table-add-column-before"
                      :text="t('table.addColumnBefore')"
                      :tooltip="false"
                      @menu-click="runColumnAction('insertLeft')"
                    />
                  </span>
                </li>
              </div>
              <div>
                <li class="mxm-dropdown__item mxm-dropdown__item--theme-default">
                  <span class="mxm-dropdown__item-text">
                    <MenusButton
                      ico="table-add-column-after"
                      :text="t('table.addColumnAfter')"
                      :tooltip="false"
                      @menu-click="runColumnAction('insertRight')"
                    />
                  </span>
                </li>
              </div>
              <div class="mxm-divider mxm-divider--horizontal mxm-table-quick-menu-divider"></div>
              <div>
                <li class="mxm-dropdown__item mxm-dropdown__item--theme-default">
                  <span class="mxm-dropdown__item-text">
                    <MenusButton
                      ico="clear-format"
                      :text="t('table.columnMenu.clear')"
                      :tooltip="false"
                      @menu-click="runColumnAction('clear')"
                    />
                  </span>
                </li>
              </div>
              <div>
                <li
                  class="mxm-dropdown__item mxm-dropdown__item--theme-default mxm-delete-node"
                >
                  <span class="mxm-dropdown__item-text">
                    <MenusButton
                      ico="table-delete-column"
                      :text="t('table.deleteColumn.text')"
                      :tooltip="false"
                      @menu-click="runColumnAction('delete')"
                    />
                  </span>
                </li>
              </div>
            </div>
          </div>
        </template>
      </TPopup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { computed, inject, ref, watch, watchEffect } from 'vue'

import { t } from '@/composables/i18n'
import {
  clearSelectedTableCellsContent,
  clearTableColumnContent,
  deleteSelectedTableColumns,
  deleteTableColumn,
  insertSelectedTableColumns,
  insertTableColumn,
  isColumnSelectionActive,
  refreshCellSelection,
  resolveActiveTableCell,
  resolveTableCellRect,
  resolveTableColumnRect,
  resolveTableWrapperElement,
  selectTableColumn,
  setSelectedTableCellColors,
  setTableColumnCellColors,
  useTableMenuState,
  type TableColorKind,
} from '@/extensions/table/operations'

const props = defineProps<{
  editor: Editor | null | undefined
}>()

const attach = inject('container')
const editorRef = computed(() => props.editor)
const handleAnchorRef = ref<HTMLElement | null>(null)
const isMenuOpen = ref(false)
const activeColorMenuKind = ref<TableColorKind | null>(null)
const showColumnMenuHandle = false

const { activeCell, isColumnSelection, selectionOverlay } =
  useTableMenuState(editorRef)

type ColumnAction = 'insertLeft' | 'insertRight' | 'clear' | 'delete'

const closeColorMenu = () => {
  activeColorMenuKind.value = null
}

const closeColumnMenu = () => {
  isMenuOpen.value = false
  closeColorMenu()
}

const isColumnMenuContextValid = (editor: Editor | null | undefined) => {
  if (!editor?.isEditable || !activeCell.value) {
    return false
  }

  if (!isColumnSelectionActive(editor)) {
    return false
  }

  return Boolean(resolveActiveTableCell(editor))
}

watch(
  () => isMenuOpen.value && !isColumnMenuContextValid(props.editor),
  (shouldClose) => {
    if (shouldClose) {
      closeColumnMenu()
    }
  },
  {
    flush: 'post',
  },
)

watchEffect((onCleanup) => {
  const editorDom = editorRef.value?.view.dom as HTMLElement | undefined
  if (!editorDom) {
    return
  }

  if (isMenuOpen.value || isColumnSelection.value) {
    editorDom.setAttribute('data-mxm-table-column-menu-active', 'true')
  } else {
    editorDom.removeAttribute('data-mxm-table-column-menu-active')
  }

  onCleanup(() => {
    editorDom.removeAttribute('data-mxm-table-column-menu-active')
  })
})

const isSelectionOverlayActive = computed(() => Boolean(selectionOverlay.value))

const activeOutlineRect = computed(() => {
  if (selectionOverlay.value && selectionOverlay.value.axis !== 'column') {
    return null
  }

  if (selectionOverlay.value?.axis === 'column') {
    return selectionOverlay.value.rect
  }

  const currentCell = activeCell.value
  if (!currentCell) {
    return null
  }

  if (isMenuOpen.value || isColumnSelection.value) {
    return resolveTableColumnRect(props.editor, currentCell)
  }

  return resolveTableCellRect(props.editor, currentCell)
})

const currentTableWrapper = computed(() => {
  return resolveTableWrapperElement(activeCell.value)
})

const activeOutlineStyle = computed(() => {
  const rect = activeOutlineRect.value
  const container = currentTableWrapper.value

  if (!rect || !container) {
    return undefined
  }

  const containerRect = container.getBoundingClientRect()

  return {
    top: `${rect.top - containerRect.top}px`,
    left: `${rect.left - containerRect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  }
})

const handleStyle = computed(() => {
  const rect = activeOutlineRect.value
  const container = currentTableWrapper.value

  if (!rect || !container) {
    return undefined
  }

  const containerRect = container.getBoundingClientRect()

  return {
    top: `${rect.top - containerRect.top + 1}px`,
    left: `${rect.left - containerRect.left + rect.width / 2}px`,
  }
})

const showColumnHandle = computed(() => {
  if (!handleStyle.value) {
    return false
  }

  if (!isSelectionOverlayActive.value) {
    return true
  }

  return isColumnSelection.value
})

const ensureColumnSelection = () => {
  const editor = props.editor
  const cell = activeCell.value

  if (!editor || !cell) {
    return false
  }

  if (isColumnSelection.value) {
    refreshCellSelection(editor)
    return true
  }

  return selectTableColumn(editor, cell)
}

const openColumnMenu = () => {
  const editor = props.editor
  if (!editor || !activeCell.value) {
    return
  }

  if (!ensureColumnSelection()) {
    closeColumnMenu()
    return
  }

  editor.commands.focus()
  isMenuOpen.value = true
}

const handlePopupVisibleChange = (visible: boolean) => {
  if (!visible) {
    closeColumnMenu()
    return
  }

  openColumnMenu()
}

const toggleColorPanel = (kind: TableColorKind) => {
  activeColorMenuKind.value =
    activeColorMenuKind.value === kind ? null : kind
}

const applyColumnColor = (kind: TableColorKind, color: string) => {
  const editor = props.editor
  const cell = activeCell.value

  if (!editor || !cell) {
    return
  }

  const value = color === '' ? null : color

  if (isColumnSelection.value) {
    setSelectedTableCellColors(editor, {
      color: kind === 'text' ? value : undefined,
      background: kind === 'background' ? value : undefined,
    })
  } else {
    setTableColumnCellColors(editor, cell, {
      color: kind === 'text' ? value : undefined,
      background: kind === 'background' ? value : undefined,
    })
  }
}

const changeTextColor = (color: string) => {
  applyColumnColor('text', color)
}

const changeBackgroundColor = (color: string) => {
  applyColumnColor('background', color)
}

const runColumnAction = (actionId: ColumnAction) => {
  const editor = props.editor
  const cell = activeCell.value

  if (!editor || !cell) {
    return
  }

  const runOnSelection = isColumnSelection.value
  let success = false

  switch (actionId) {
    case 'insertLeft':
      success = runOnSelection
        ? insertSelectedTableColumns(editor, 'before')
        : insertTableColumn(editor, cell, 'before')
      break
    case 'insertRight':
      success = runOnSelection
        ? insertSelectedTableColumns(editor, 'after')
        : insertTableColumn(editor, cell, 'after')
      break
    case 'clear':
      success = runOnSelection
        ? clearSelectedTableCellsContent(editor)
        : clearTableColumnContent(editor, cell)
      break
    case 'delete':
      success = runOnSelection
        ? deleteSelectedTableColumns(editor)
        : deleteTableColumn(editor, cell)
      break
  }

  if (success) {
    closeColumnMenu()
  }
}
</script>
