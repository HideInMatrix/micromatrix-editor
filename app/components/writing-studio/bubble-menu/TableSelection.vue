<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import type { Component } from "vue";
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
} from "~/composables/writing-studio/table/useTableOperations";

const props = defineProps<{
  editor: Editor | null | undefined;
  container: HTMLElement | null;
}>();

type TableSelectionActionId = "addRowBefore" | "addRowAfter" | "deleteRow" | "splitCell";

type TableSelectionActionItem = {
  id: TableSelectionActionId;
  icon: Component;
  labelKey: string;
  destructive?: boolean;
};

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

const tableSelectionActions: TableSelectionActionItem[] = [
  {
    id: "addRowBefore",
    icon: ArrowUpToLine,
    labelKey: "writingStudio.toolbar.table.addRowBefore",
  },
  {
    id: "addRowAfter",
    icon: ArrowDownToLine,
    labelKey: "writingStudio.toolbar.table.addRowAfter",
  },
  {
    id: "deleteRow",
    icon: Trash2,
    labelKey: "writingStudio.toolbar.table.deleteRow",
    destructive: true,
  },
  {
    id: "splitCell",
    icon: TableCellsSplit,
    labelKey: "writingStudio.toolbar.table.selectionMenu.splitCell",
  },
];

const runSelectionAction = (actionId: TableSelectionActionId) => {
  const editor = props.editor;
  if (!editor) {
    return;
  }

  closeColorMenu();

  const actionHandlers: Record<TableSelectionActionId, () => boolean> = {
    addRowBefore: () => editor.chain().focus().addRowBefore().run(),
    addRowAfter: () => editor.chain().focus().addRowAfter().run(),
    deleteRow: () => editor.chain().focus().deleteRow().run(),
    splitCell: () => editor.chain().focus().splitCell().run(),
  };

  const success = actionHandlers[actionId]();

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
      <Card class="ws-table-selection-menu w-44 min-w-36 max-w-[calc(100vw-16px)] rounded-md shadow-lg">
        <div class="ws-table-selection-menu-items p-0.5">
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
              <button
                type="button"
                class="ws-table-column-menu-item min-h-8 gap-1.5 rounded-md px-2 py-1.5 text-[11px]"
                :class="{ 'ws-table-column-menu-item--active': activeColorMenuKind === 'text' }"
                @mousedown.prevent
                @mouseenter="openColorMenu('text')"
              >
                <Type class="ws-table-column-menu-icon h-3.5 w-3.5" />
                <span class="flex-1 text-left">
                  {{ t("writingStudio.toolbar.table.columnMenu.colors.text.title") }}
                </span>
                <ChevronRight class="h-3 w-3 opacity-65" />
              </button>
            </HoverCardTrigger>

            <HoverCardContent side="right" align="start" :side-offset="6" class="ws-table-color-menu w-[15rem] rounded-md p-0.5 shadow-lg">
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
              <button
                type="button"
                class="ws-table-column-menu-item min-h-8 gap-1.5 rounded-md px-2 py-1.5 text-[11px]"
                :class="{ 'ws-table-column-menu-item--active': activeColorMenuKind === 'background' }"
                @mousedown.prevent
                @mouseenter="openColorMenu('background')"
              >
                <PaintBucket class="ws-table-column-menu-icon h-3.5 w-3.5" />
                <span class="flex-1 text-left">
                  {{ t("writingStudio.toolbar.table.columnMenu.colors.background.title") }}
                </span>
                <ChevronRight class="h-3 w-3 opacity-65" />
              </button>
            </HoverCardTrigger>

            <HoverCardContent side="right" align="start" :side-offset="6" class="ws-table-color-menu w-[15rem] rounded-md p-0.5 shadow-lg">
              <div @pointerenter="openColorMenu('background')">
                <ColorPanel :kinds="['background']" @select="({ kind, value }) => applySelectionColor(kind, value)" />
              </div>
            </HoverCardContent>
          </HoverCard>

          <button
            v-if="selectedCellCount > 1 && canMergeSelectedCells"
            type="button"
            class="ws-table-column-menu-item min-h-8 gap-1.5 rounded-md px-2 py-1.5 text-[11px]"
            @mousedown.prevent
            @mouseenter="closeColorMenu"
            @click="mergeSelectedCells"
          >
            <TableCellsMerge class="ws-table-column-menu-icon h-3.5 w-3.5" />
            <span class="flex-1 text-left">
              {{ t("writingStudio.toolbar.table.selectionMenu.mergeCells") }}
            </span>
          </button>

          <button
            v-for="action in tableSelectionActions"
            :key="action.id"
            type="button"
            class="ws-table-column-menu-item min-h-8 gap-1.5 rounded-md px-2 py-1.5 text-[11px]"
            :class="{ 'ws-table-column-menu-item--danger': action.destructive }"
            @mousedown.prevent
            @mouseenter="closeColorMenu"
            @click="runSelectionAction(action.id)">
            <component :is="action.icon" class="ws-table-column-menu-icon h-3.5 w-3.5" />
            <span class="flex-1 text-left">
              {{ t(action.labelKey) }}
            </span>
          </button>
        </div>
      </Card>
    </div>
  </BubbleMenu>
</template>
