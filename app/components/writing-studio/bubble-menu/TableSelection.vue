<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import { ArrowDownToLine, ArrowUpToLine, ChevronRight, GripVertical, PaintBucket, TableCellsMerge, TableCellsSplit, Trash2, Type } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import ColorPanel from "@/components/writing-studio/bubble-menu/table/ColorPanel.vue";
import {
  getWritingStudioTableColorPreset,
  mergeWritingStudioSelectedTableCells,
  resolveWritingStudioTableCellRect,
  resolveWritingStudioTableWrapperElement,
  setWritingStudioTableSelectedCellColors,
  useWritingStudioTableColumnMenuState,
  type WritingStudioTableCellColorValue,
  type WritingStudioTableColorKind,
} from "~/composables/writing-studio/table/useTableColumn";

const props = defineProps<{
  editor: Editor | null | undefined;
  container: HTMLElement | null;
}>();

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const handleAnchorRef = ref<HTMLElement | null>(null);
const isMenuOpen = ref(false);
const openedSelectionKey = ref<string | null>(null);
const activeColorMenuKind = ref<WritingStudioTableColorKind | null>(null);
const { activeCell, selectionOverlay, selectedCellCount, canMergeSelectedCells } = useWritingStudioTableColumnMenuState(editorRef);

const TABLE_SELECTION_MENU_PLUGIN_KEY = "writing-studio-table-selection-menu";

const requestSelectionMenuPositionUpdate = async () => {
  if (!props.editor || props.editor.isDestroyed) {
    return;
  }

  await nextTick();

  props.editor.view.dispatch(props.editor.state.tr.setMeta(TABLE_SELECTION_MENU_PLUGIN_KEY, "updatePosition"));
};

const closeColorMenu = () => {
  activeColorMenuKind.value = null;
  requestSelectionMenuPositionUpdate();
};

const openColorMenu = (kind: WritingStudioTableColorKind) => {
  activeColorMenuKind.value = kind;
  requestSelectionMenuPositionUpdate();
};

const closeSelectionMenu = () => {
  isMenuOpen.value = false;
  openedSelectionKey.value = null;
  activeColorMenuKind.value = null;
};

const currentSelectionKey = computed(() => {
  const editor = props.editor;
  const currentCell = activeCell.value;

  if (!editor || !currentCell) {
    return null;
  }

  const { selection } = editor.state;
  const selectionType = selection.constructor.name;

  return [selectionType, currentCell.tablePos, currentCell.cellPos, selection.from, selection.to].join(":");
});

const isSelectionMenuContextValid = (editor: Editor | null | undefined) => {
  if (!editor?.isEditable || !activeCell.value || !openedSelectionKey.value) {
    return false;
  }

  return currentSelectionKey.value === openedSelectionKey.value;
};

watch(
  () => isMenuOpen.value && !isSelectionMenuContextValid(props.editor),
  (shouldClose) => {
    if (shouldClose) {
      closeSelectionMenu();
    }
  },
  {
    flush: "post",
  },
);

const activeOutlineRect = computed(() => {
  if (selectionOverlay.value) {
    return selectionOverlay.value.rect;
  }

  return resolveWritingStudioTableCellRect(props.editor, activeCell.value);
});

const currentTableWrapper = computed(() => {
  return resolveWritingStudioTableWrapperElement(activeCell.value);
});

const handleStyle = computed(() => {
  const rect = activeOutlineRect.value;
  const container = currentTableWrapper.value;

  if (!rect || !container) {
    return undefined;
  }

  const containerRect = container.getBoundingClientRect();

  return {
    top: `${rect.top - containerRect.top + rect.height / 2}px`,
    left: `${rect.left - containerRect.left + rect.width - 1}px`,
  };
});

const openSelectionMenu = () => {
  if (!props.editor || !activeCell.value || !currentSelectionKey.value) {
    return;
  }

  props.editor.commands.focus();
  openedSelectionKey.value = currentSelectionKey.value;
  isMenuOpen.value = true;
};

const getSelectionMenuVirtualElement = () => {
  if (!isMenuOpen.value || !props.editor) {
    return null;
  }

  const handleAnchor = handleAnchorRef.value;
  if (handleAnchor) {
    return {
      contextElement: handleAnchor,
      getBoundingClientRect: () => handleAnchor.getBoundingClientRect(),
      getClientRects: () => [handleAnchor.getBoundingClientRect()],
    };
  }

  const rect = activeOutlineRect.value;
  if (!rect || !import.meta.client) {
    return null;
  }

  const domRect = new DOMRect(rect.left + rect.width, rect.top + rect.height / 2, 0, 0);

  return {
    getBoundingClientRect: () => domRect,
    getClientRects: () => [domRect],
  };
};

const shouldShowSelectionMenu = (menuProps: any) => {
  const currentEditor = menuProps?.editor as Editor | undefined;

  return Boolean(isMenuOpen.value && isSelectionMenuContextValid(currentEditor));
};

const applySelectionColor = (kind: WritingStudioTableColorKind, value: WritingStudioTableCellColorValue) => {
  if (!props.editor) {
    return;
  }

  const preset = getWritingStudioTableColorPreset(kind, value);

  setWritingStudioTableSelectedCellColors(props.editor, {
    textColor: kind === "text" ? preset.textColor : undefined,
    backgroundColor: kind === "background" ? preset.backgroundColor : undefined,
  });

  closeColorMenu();
};

const mergeSelectedCells = () => {
  if (!props.editor) {
    return;
  }

  const success = mergeWritingStudioSelectedTableCells(props.editor);
  if (!success) {
    return;
  }

  closeSelectionMenu();
};

const runSelectionAction = (actionId: "addRowBefore" | "addRowAfter" | "deleteRow" | "splitCell") => {
  if (!props.editor) {
    return;
  }

  closeColorMenu();

  let success = false;

  if (actionId === "addRowBefore") {
    success = props.editor.chain().focus().addRowBefore().run();
  }
  else if (actionId === "addRowAfter") {
    success = props.editor.chain().focus().addRowAfter().run();
  }
  else if (actionId === "deleteRow") {
    success = props.editor.chain().focus().deleteRow().run();
  }
  else {
    success = props.editor.chain().focus().splitCell().run();
  }

  if (success) {
    closeSelectionMenu();
  }
};
</script>

<template>
  <Teleport v-if="currentTableWrapper && handleStyle" :to="currentTableWrapper">
    <div ref="handleAnchorRef" contenteditable="false" class="ws-table-selection-handle-anchor" :style="handleStyle">
      <Button
        type="button"
        variant="outline"
        class="ws-table-selection-handle"
        :class="{ 'ws-table-selection-handle--active': isMenuOpen }"
        :aria-label="t('writingStudio.toolbar.table.selectionMenu.handle')"
        @pointerdown.prevent.stop
        @mousedown.prevent.stop
        @click.stop="openSelectionMenu">
        <GripVertical class="ws-table-selection-handle-icon" />
      </Button>
    </div>
  </Teleport>
  <BubbleMenu
    v-if="editor && isMenuOpen"
    plugin-key="writing-studio-table-selection-menu"
    class="z-2"
    :editor="editor"
    :should-show="shouldShowSelectionMenu"
    :get-referenced-virtual-element="getSelectionMenuVirtualElement"
    :options="{ placement: 'bottom-start' }">
    <div class="ws-table-column-bubble-layer">
      <Card class="ws-table-selection-menu">
        <div class="ws-table-selection-menu-items">
          <HoverCard
            :open="activeColorMenuKind === 'text'"
            :open-delay="0"
            :close-delay="0"
            @update:open="
              (value) => {
                if (value) {
                  openColorMenu('text');
                  return;
                }

                if (activeColorMenuKind === 'text') {
                  closeColorMenu();
                }
              }
            ">
            <HoverCardTrigger as-child>
              <button type="button" class="ws-table-column-menu-item" :class="{ 'ws-table-column-menu-item--active': activeColorMenuKind === 'text' }" @mousedown.prevent @mouseenter="openColorMenu('text')">
                <Type class="ws-table-column-menu-icon" />
                <span class="flex-1 text-left">
                  {{ t("writingStudio.toolbar.table.columnMenu.colors.text.title") }}
                </span>
                <ChevronRight class="h-4 w-4 opacity-65" />
              </button>
            </HoverCardTrigger>

            <HoverCardContent side="right" align="start" :side-offset="12" class="ws-table-color-menu">
              <div @pointerenter="openColorMenu('text')">
                <ColorPanel :kinds="['text']" @select="({ kind, value }) => applySelectionColor(kind, value)" />
              </div>
            </HoverCardContent>
          </HoverCard>

          <HoverCard
            :open="activeColorMenuKind === 'background'"
            :open-delay="0"
            :close-delay="0"
            @update:open="
              (value) => {
                if (value) {
                  openColorMenu('background');
                  return;
                }

                if (activeColorMenuKind === 'background') {
                  closeColorMenu();
                }
              }
            ">
            <HoverCardTrigger as-child>
              <button type="button" class="ws-table-column-menu-item" :class="{ 'ws-table-column-menu-item--active': activeColorMenuKind === 'background' }" @mousedown.prevent @mouseenter="openColorMenu('background')">
                <PaintBucket class="ws-table-column-menu-icon" />
                <span class="flex-1 text-left">
                  {{ t("writingStudio.toolbar.table.columnMenu.colors.background.title") }}
                </span>
                <ChevronRight class="h-4 w-4 opacity-65" />
              </button>
            </HoverCardTrigger>

            <HoverCardContent side="right" align="start" :side-offset="12" class="ws-table-color-menu">
              <div @pointerenter="openColorMenu('background')">
                <ColorPanel :kinds="['background']" @select="({ kind, value }) => applySelectionColor(kind, value)" />
              </div>
            </HoverCardContent>
          </HoverCard>

          <button v-if="selectedCellCount > 1 && canMergeSelectedCells" type="button" class="ws-table-column-menu-item" @mousedown.prevent @mouseenter="closeColorMenu" @click="mergeSelectedCells">
            <TableCellsMerge class="ws-table-column-menu-icon" />
            <span class="flex-1 text-left">
              {{ t("writingStudio.toolbar.table.selectionMenu.mergeCells") }}
            </span>
          </button>

          <button type="button" class="ws-table-column-menu-item" @mousedown.prevent @mouseenter="closeColorMenu" @click="runSelectionAction('addRowBefore')">
            <ArrowUpToLine class="ws-table-column-menu-icon" />
            <span class="flex-1 text-left">
              {{ t("writingStudio.toolbar.table.addRowBefore") }}
            </span>
          </button>

          <button type="button" class="ws-table-column-menu-item" @mousedown.prevent @mouseenter="closeColorMenu" @click="runSelectionAction('addRowAfter')">
            <ArrowDownToLine class="ws-table-column-menu-icon" />
            <span class="flex-1 text-left">
              {{ t("writingStudio.toolbar.table.addRowAfter") }}
            </span>
          </button>

          <button type="button" class="ws-table-column-menu-item ws-table-column-menu-item--danger" @mousedown.prevent @mouseenter="closeColorMenu" @click="runSelectionAction('deleteRow')">
            <Trash2 class="ws-table-column-menu-icon" />
            <span class="flex-1 text-left">
              {{ t("writingStudio.toolbar.table.deleteRow") }}
            </span>
          </button>

          <button type="button" class="ws-table-column-menu-item" @mousedown.prevent @mouseenter="closeColorMenu" @click="runSelectionAction('splitCell')">
            <TableCellsSplit class="ws-table-column-menu-icon" />
            <span class="flex-1 text-left">
              {{ t("writingStudio.toolbar.table.selectionMenu.splitCell") }}
            </span>
          </button>
        </div>
      </Card>
    </div>
  </BubbleMenu>
</template>
