<template>
  <Teleport
    v-if="currentTableWrapper"
    :to="currentTableWrapper"
  >
    <div
      v-if="selectionOverlayStyle"
      class="mxm-table-selection-overlay"
    >
      <div
        class="mxm-table-selection-overlay-outline"
        :style="selectionOverlayStyle"
      />
    </div>
    <div
      v-if="showSelectionMenuHandle && handleStyle && showSelectionHandle"
      ref="handleAnchorRef"
      contenteditable="false"
      class="mxm-table-selection-handle-anchor"
      :style="handleStyle"
    >
      <TPopup
        :visible="isMenuOpen"
        :attach="attach"
        trigger="click"
        placement="right-top"
        overlay-inner-class-name="mxm-table-quick-popup"
        @visible-change="handlePopupVisibleChange"
      >
        <TButton
          theme="default"
          variant="outline"
          size="small"
          class="mxm-table-selection-handle"
          :class="{ active: isMenuOpen }"
          :title="t('table.selectionMenu.text')"
          @pointerdown.prevent.stop
          @mousedown.prevent.stop
        >
          <Icon name="menu" class="mxm-table-selection-handle-icon" />
        </TButton>
        <template #content>
          <div
            class="mxm-dropdown__menu mxm-dropdown__menu--right mxm-table-quick-menu mxm-table-column-menu mxm-table-selection-menu"
            @mousedown.prevent.stop
          >
            <div>
              <li
                class="mxm-dropdown__item mxm-dropdown__item--theme-default mxm-dropdown__item--disabled mxm-block-menu-group-name mxm-table-quick-menu-title"
              >
                <span class="mxm-dropdown__item-text">
                  {{ t('table.selectionMenu.text') }}
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
              <div v-if="selectedCellCount > 1 && canMergeSelectedCells">
                <li class="mxm-dropdown__item mxm-dropdown__item--theme-default">
                  <span class="mxm-dropdown__item-text">
                    <MenusButton
                      ico="table-merge-cell"
                      :text="t('table.mergeCells')"
                      :tooltip="false"
                      @menu-click="mergeCells"
                    />
                  </span>
                </li>
              </div>
              <div>
                <li class="mxm-dropdown__item mxm-dropdown__item--theme-default">
                  <span class="mxm-dropdown__item-text">
                    <MenusButton
                      ico="table-add-row-before"
                      :text="t('table.addRowBefore')"
                      :tooltip="false"
                      @menu-click="runSelectionAction('addRowBefore')"
                    />
                  </span>
                </li>
              </div>
              <div>
                <li class="mxm-dropdown__item mxm-dropdown__item--theme-default">
                  <span class="mxm-dropdown__item-text">
                    <MenusButton
                      ico="table-add-row-after"
                      :text="t('table.addRowAfter')"
                      :tooltip="false"
                      @menu-click="runSelectionAction('addRowAfter')"
                    />
                  </span>
                </li>
              </div>
              <div>
                <li class="mxm-dropdown__item mxm-dropdown__item--theme-default">
                  <span class="mxm-dropdown__item-text">
                    <MenusButton
                      ico="table-split-cell"
                      :text="t('table.splitCell')"
                      :tooltip="false"
                      @menu-click="runSelectionAction('splitCell')"
                    />
                  </span>
                </li>
              </div>
              <div class="mxm-divider mxm-divider--horizontal mxm-table-quick-menu-divider"></div>
              <div>
                <li
                  class="mxm-dropdown__item mxm-dropdown__item--theme-default mxm-delete-node"
                >
                  <span class="mxm-dropdown__item-text">
                    <MenusButton
                      ico="table-delete-row"
                      :text="t('table.deleteRow.text')"
                      :tooltip="false"
                      @menu-click="runSelectionAction('deleteRow')"
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
  mergeSelectedTableCells,
  resolveTableCellRect,
  resolveTableWrapperElement,
  setSelectedTableCellColors,
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
const openedSelectionKey = ref<string | null>(null)
const activeColorMenuKind = ref<TableColorKind | null>(null)
const showSelectionMenuHandle = false

const {
  activeCell,
  selectionOverlay,
  selectedCellCount,
  canMergeSelectedCells,
} = useTableMenuState(editorRef)

type TableSelectionActionId =
  | 'addRowBefore'
  | 'addRowAfter'
  | 'deleteRow'
  | 'splitCell'

const closeColorMenu = () => {
  activeColorMenuKind.value = null
}

const closeSelectionMenu = () => {
  isMenuOpen.value = false
  openedSelectionKey.value = null
  closeColorMenu()
}

const currentSelectionKey = computed(() => {
  const editor = props.editor
  const currentCell = activeCell.value

  if (!editor || !currentCell) {
    return null
  }

  const { selection } = editor.state
  return [
    selection.constructor.name,
    currentCell.tablePos,
    currentCell.cellPos,
    selection.from,
    selection.to,
  ].join(':')
})

const isSelectionMenuContextValid = (editor: Editor | null | undefined) => {
  if (!editor?.isEditable || !activeCell.value || !openedSelectionKey.value) {
    return false
  }

  return currentSelectionKey.value === openedSelectionKey.value
}

watch(
  () => isMenuOpen.value && !isSelectionMenuContextValid(props.editor),
  (shouldClose) => {
    if (shouldClose) {
      closeSelectionMenu()
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

  if (selectionOverlay.value) {
    editorDom.setAttribute('data-mxm-table-selection-overlay-active', 'true')
  } else {
    editorDom.removeAttribute('data-mxm-table-selection-overlay-active')
  }

  onCleanup(() => {
    editorDom.removeAttribute('data-mxm-table-selection-overlay-active')
  })
})

const activeOutlineRect = computed(() => {
  if (selectionOverlay.value) {
    return selectionOverlay.value.rect
  }

  return resolveTableCellRect(props.editor, activeCell.value)
})

const currentTableWrapper = computed(() => {
  return resolveTableWrapperElement(activeCell.value)
})

const selectionOverlayStyle = computed(() => {
  const overlay = selectionOverlay.value
  const container = currentTableWrapper.value

  if (!overlay || overlay.axis === 'column' || !container) {
    return undefined
  }

  const containerRect = container.getBoundingClientRect()
  const { rect } = overlay

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
    top: `${rect.top - containerRect.top + rect.height / 2}px`,
    left: `${rect.left - containerRect.left + rect.width - 1}px`,
  }
})

const showSelectionHandle = computed(() => {
  return Boolean(
    handleStyle.value && selectionOverlay.value?.axis !== 'column',
  )
})

const openSelectionMenu = () => {
  if (!props.editor || !activeCell.value || !currentSelectionKey.value) {
    return
  }

  props.editor.commands.focus()
  openedSelectionKey.value = currentSelectionKey.value
  isMenuOpen.value = true
}

const handlePopupVisibleChange = (visible: boolean) => {
  if (!visible) {
    closeSelectionMenu()
    return
  }

  openSelectionMenu()
}

const toggleColorPanel = (kind: TableColorKind) => {
  activeColorMenuKind.value =
    activeColorMenuKind.value === kind ? null : kind
}

const applySelectionColor = (kind: TableColorKind, color: string) => {
  if (!props.editor) {
    return
  }

  const value = color === '' ? null : color
  setSelectedTableCellColors(props.editor, {
    color: kind === 'text' ? value : undefined,
    background: kind === 'background' ? value : undefined,
  })
}

const changeTextColor = (color: string) => {
  applySelectionColor('text', color)
}

const changeBackgroundColor = (color: string) => {
  applySelectionColor('background', color)
}

const mergeCells = () => {
  if (!mergeSelectedTableCells(props.editor)) {
    return
  }

  closeSelectionMenu()
}

const runSelectionAction = (actionId: TableSelectionActionId) => {
  const editor = props.editor
  if (!editor) {
    return
  }

  const actionHandlers: Record<TableSelectionActionId, () => boolean> = {
    addRowBefore: () => editor.chain().focus().addRowBefore().run(),
    addRowAfter: () => editor.chain().focus().addRowAfter().run(),
    deleteRow: () => editor.chain().focus().deleteRow().run(),
    splitCell: () => editor.chain().focus().splitCell().run(),
  }

  if (actionHandlers[actionId]()) {
    closeSelectionMenu()
  }
}
</script>
