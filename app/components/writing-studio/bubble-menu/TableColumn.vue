<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import type { Component } from "vue";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import { ArrowLeft, ArrowRight, ChevronRight, CircleX, GripHorizontal, PaintBucket, Trash2, Type } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ColorPanel from "@/components/writing-studio/bubble-menu/table/ColorPanel.vue";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  clearWritingStudioSelectedTableCellsContent,
  clearWritingStudioTableColumnContent,
  deleteWritingStudioSelectedTableColumns,
  deleteWritingStudioTableColumn,
  getWritingStudioTableColorPreset,
  insertWritingStudioSelectedTableColumns,
  insertWritingStudioTableColumn,
  isWritingStudioColumnSelectionActive,
  refreshWritingStudioCellSelection,
  resolveWritingStudioActiveTableCell,
  resolveWritingStudioTableCellRect,
  resolveWritingStudioTableColumnRect,
  resolveWritingStudioTableWrapperElement,
  selectWritingStudioTableColumn,
  setWritingStudioTableSelectedCellColors,
  setWritingStudioTableColumnCellColors,
  useWritingStudioTableColumnColors,
  useWritingStudioTableColumnMenuState,
  type WritingStudioTableCellColorValue,
  type WritingStudioTableColorKind,
} from "~/composables/writing-studio/table/useTableOperations";

const props = defineProps<{
  editor: Editor | null | undefined;
  container: HTMLElement | null;
}>();

type TableColumnColorActionId = "textColor" | "backgroundColor";
type TableColumnActionKey = TableColumnColorActionId | "insertLeft" | "insertRight" | "clear" | "delete";

type TableColumnActionItem = {
  id: TableColumnActionKey;
  icon: Component;
  label: string;
  keyword: string;
  hint?: string;
  destructive?: boolean;
};

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const handleAnchorRef = ref<HTMLElement | null>(null);
const isMenuOpen = ref(false);
const activeColorMenuKind = ref<WritingStudioTableColorKind | null>(null);
const searchQuery = ref("");
const { activeCell, isColumnSelection, selectionOverlay } = useWritingStudioTableColumnMenuState(editorRef);
const colorPresets = useWritingStudioTableColumnColors();

const TABLE_COLUMN_MENU_PLUGIN_KEY = "writing-studio-table-column-menu";
const TABLE_COLUMN_HANDLE_WIDTH_REM = 2.5;
const TABLE_COLUMN_HANDLE_HEIGHT_REM = 1.5;
const TABLE_COLUMN_HANDLE_TOP_OFFSET_PX = 1;

const closeColorMenu = () => {
  activeColorMenuKind.value = null;
  requestColumnMenuPositionUpdate();
};

const openColorMenu = (kind: WritingStudioTableColorKind) => {
  activeColorMenuKind.value = kind;
  requestColumnMenuPositionUpdate();
};

const closeColumnMenu = () => {
  isMenuOpen.value = false;
  activeColorMenuKind.value = null;
  searchQuery.value = "";
};

const requestColumnMenuPositionUpdate = async () => {
  if (!props.editor || props.editor.isDestroyed) {
    return;
  }

  await nextTick();
  props.editor.view.dispatch(
    props.editor.state.tr.setMeta(TABLE_COLUMN_MENU_PLUGIN_KEY, "updatePosition"),
  );
};

const resolveFilteredColorEntries = (kind: WritingStudioTableColorKind) => {
  const query = searchQuery.value.trim().toLowerCase();
  const entries = Object.entries(colorPresets[kind]) as Array<[WritingStudioTableCellColorValue, (typeof colorPresets)[typeof kind][WritingStudioTableCellColorValue]]>;

  if (!query) {
    return entries;
  }

  return entries.filter(([, preset]) => {
    return t(preset.labelKey).toLowerCase().includes(query);
  });
};

const filteredTextColorEntries = computed(() => {
  return resolveFilteredColorEntries("text");
});

const filteredBackgroundColorEntries = computed(() => {
  return resolveFilteredColorEntries("background");
});

const tableColumnActions = computed<TableColumnActionItem[]>(() => {
  return [
    {
      id: "textColor",
      icon: Type,
      label: t("writingStudio.toolbar.table.columnMenu.colors.text.title"),
      keyword: "text color palette font",
    },
    {
      id: "backgroundColor",
      icon: PaintBucket,
      label: t("writingStudio.toolbar.table.columnMenu.colors.background.title"),
      keyword: "background color palette fill",
    },
    {
      id: "insertLeft",
      icon: ArrowLeft,
      label: t("writingStudio.toolbar.table.columnMenu.insertLeft"),
      keyword: "insert left add before",
    },
    {
      id: "insertRight",
      icon: ArrowRight,
      label: t("writingStudio.toolbar.table.columnMenu.insertRight"),
      keyword: "insert right add after",
    },
    {
      id: "clear",
      icon: CircleX,
      label: t("writingStudio.toolbar.table.columnMenu.clear"),
      keyword: "clear erase content",
    },
    {
      id: "delete",
      icon: Trash2,
      label: t("writingStudio.toolbar.table.columnMenu.delete"),
      keyword: "delete remove column",
      destructive: true,
    },
  ];
});

const filteredTableActions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  if (!query) {
    return tableColumnActions.value;
  }

  return tableColumnActions.value.filter((action) => {
    if (action.id === "textColor") {
      return action.label.toLowerCase().includes(query) || action.keyword.includes(query) || filteredTextColorEntries.value.length > 0;
    }

    if (action.id === "backgroundColor") {
      return action.label.toLowerCase().includes(query) || action.keyword.includes(query) || filteredBackgroundColorEntries.value.length > 0;
    }

    return action.label.toLowerCase().includes(query) || action.keyword.includes(query);
  });
});

const isColumnMenuContextValid = (editor: Editor | null | undefined) => {
  if (!editor?.isEditable || !activeCell.value) {
    return false;
  }

  if (!isWritingStudioColumnSelectionActive(editor)) {
    return false;
  }

  return Boolean(resolveWritingStudioActiveTableCell(editor));
};

watch(
  () => isMenuOpen.value && !isColumnMenuContextValid(props.editor),
  (shouldClose) => {
    if (shouldClose) {
      closeColumnMenu();
    }
  },
  {
    flush: "post",
  },
);

watchEffect((onCleanup) => {
  const editorDom = editorRef.value?.view.dom as HTMLElement | undefined;
  if (!editorDom) {
    return;
  }

  if (isMenuOpen.value) {
    editorDom.setAttribute("data-ws-column-menu-active", "true");
  }
  else {
    editorDom.removeAttribute("data-ws-column-menu-active");
  }

  if (!isMenuOpen.value && selectionOverlay.value) {
    editorDom.setAttribute("data-ws-selection-overlay-active", "true");
  }
  else {
    editorDom.removeAttribute("data-ws-selection-overlay-active");
  }

  onCleanup(() => {
    editorDom.removeAttribute("data-ws-column-menu-active");
    editorDom.removeAttribute("data-ws-selection-overlay-active");
  });
});

const isSelectionOverlayActive = computed(() => {
  return Boolean(selectionOverlay.value);
});

const activeOutlineRect = computed(() => {
  if (selectionOverlay.value) {
    return selectionOverlay.value.rect;
  }

  const currentCell = activeCell.value;

  if (!currentCell) {
    return null;
  }

  if (isMenuOpen.value || isColumnSelection.value) {
    return resolveWritingStudioTableColumnRect(props.editor, currentCell);
  }

  return resolveWritingStudioTableCellRect(props.editor, currentCell);
});

const currentTableWrapper = computed(() => {
  return resolveWritingStudioTableWrapperElement(activeCell.value);
});

const showColumnHandle = computed(() => {
  if (!handleStyle.value) {
    return false;
  }

  if (!isSelectionOverlayActive.value) {
    return true;
  }

  return isColumnSelection.value;
});

const activeOutlineStyle = computed(() => {
  const rect = activeOutlineRect.value;
  const container = currentTableWrapper.value;

  if (!rect || !container) {
    return undefined;
  }

  const containerRect = container.getBoundingClientRect();

  return {
    top: `${rect.top - containerRect.top}px`,
    left: `${rect.left - containerRect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
});

const handleStyle = computed(() => {
  const rect = activeOutlineRect.value;
  const container = currentTableWrapper.value;

  if (!rect || !container) {
    return undefined;
  }

  const containerRect = container.getBoundingClientRect();

  return {
    top: `${rect.top - containerRect.top + 1}px`,
    left: `${rect.left - containerRect.left + rect.width / 2}px`,
  };
});

const getColumnMenuVirtualElement = () => {
  if (!isMenuOpen.value || !props.editor || !isColumnSelection.value) {
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

  const rootFontSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize || "16");
  const handleWidth = TABLE_COLUMN_HANDLE_WIDTH_REM * rootFontSize;
  const handleHeight = TABLE_COLUMN_HANDLE_HEIGHT_REM * rootFontSize;
  const domRect = new DOMRect(
    rect.left + rect.width / 2 - handleWidth / 2,
    rect.top + TABLE_COLUMN_HANDLE_TOP_OFFSET_PX - handleHeight / 2,
    handleWidth,
    handleHeight,
  );

  return {
    getBoundingClientRect: () => domRect,
    getClientRects: () => [domRect],
  };
};

const ensureColumnSelection = () => {
  const editor = props.editor;
  const cell = activeCell.value;

  if (!editor || !cell) {
    return false;
  }

  if (isColumnSelection.value) {
    refreshWritingStudioCellSelection(editor);
    return true;
  }

  return selectWritingStudioTableColumn(editor, cell);
};

const openColumnMenu = () => {
  const editor = props.editor;
  if (!editor || !activeCell.value) {
    return;
  }

  activeColorMenuKind.value = null;
  isMenuOpen.value = true;

  if (!ensureColumnSelection()) {
    closeColumnMenu();
    return;
  }

  editor.commands.focus();
  requestColumnMenuPositionUpdate();
};

const shouldShowColumnMenu = ({ editor }: any) => {
  const currentEditor = editor as Editor | undefined;

  return Boolean(
    isMenuOpen.value
    && isColumnMenuContextValid(currentEditor),
  );
};

const runColumnAction = (actionId: Exclude<TableColumnActionKey, TableColumnColorActionId>) => {
  const editor = props.editor;
  const cell = activeCell.value;

  if (!editor || !cell) {
    return;
  }

  closeColorMenu();

  const runOnSelection = isColumnSelection.value;

  switch (actionId) {
    case "insertLeft":
      if (runOnSelection) {
        insertWritingStudioSelectedTableColumns(editor, "before");
      }
      else {
        insertWritingStudioTableColumn(editor, cell, "before");
      }
      break;
    case "insertRight":
      if (runOnSelection) {
        insertWritingStudioSelectedTableColumns(editor, "after");
      }
      else {
        insertWritingStudioTableColumn(editor, cell, "after");
      }
      break;
    case "clear":
      if (runOnSelection) {
        clearWritingStudioSelectedTableCellsContent(editor);
      }
      else {
        clearWritingStudioTableColumnContent(editor, cell);
      }
      break;
    case "delete":
      if (runOnSelection) {
        deleteWritingStudioSelectedTableColumns(editor);
      }
      else {
        deleteWritingStudioTableColumn(editor, cell);
      }
      break;
    default:
      break;
  }

  closeColumnMenu();
};

const applyColumnColor = (kind: WritingStudioTableColorKind, value: WritingStudioTableCellColorValue) => {
  const editor = props.editor;
  const cell = activeCell.value;

  if (!editor || !cell) {
    return;
  }

  const preset = getWritingStudioTableColorPreset(kind, value);
  const colorInput = {
    textColor: kind === "text" ? preset.textColor : undefined,
    backgroundColor: kind === "background" ? preset.backgroundColor : undefined,
  };

  if (isColumnSelection.value) {
    setWritingStudioTableSelectedCellColors(editor, colorInput);
  }
  else {
    setWritingStudioTableColumnCellColors(editor, cell, colorInput);
  }

  closeColorMenu();
};
</script>

<template>
  <Teleport v-if="currentTableWrapper && handleStyle" :to="currentTableWrapper">
    <div
      v-if="showColumnHandle"
      ref="handleAnchorRef"
      contenteditable="false"
      class="ws-table-column-handle-anchor"
      :style="handleStyle"
    >
      <Button
        type="button"
        variant="outline"
        class="ws-table-column-handle"
        :class="{ 'ws-table-column-handle--active': isMenuOpen }"
        :aria-label="t('writingStudio.toolbar.table.columnMenu.handle')"
        @pointerdown.prevent.stop
        @mousedown.prevent.stop
        @click.stop="openColumnMenu">
        <GripHorizontal class="ws-table-column-handle-icon" />
      </Button>
    </div>
  </Teleport>
  <Teleport v-if="currentTableWrapper && activeOutlineStyle" :to="currentTableWrapper">
    <div
      class="ws-table-column-selection z-1"
      :class="{ 'ws-table-column-selection--overlay': isSelectionOverlayActive }"
      :style="activeOutlineStyle"
    >
      <div
        class="ws-table-column-selection-outline"
        :class="{ 'ws-table-column-selection-outline--column': isMenuOpen || isColumnSelection }"
      />
    </div>
  </Teleport>
  <BubbleMenu
    v-if="editor"
    plugin-key="writing-studio-table-column-menu"
    class="z-2"
    :editor="editor"
    :should-show="shouldShowColumnMenu"
    :get-referenced-virtual-element="getColumnMenuVirtualElement"
    :options="{ placement: 'bottom-start' }">
    <div class="ws-table-column-bubble-layer">
      <Card class="ws-table-column-menu w-52 min-w-36 max-w-[calc(100vw-16px)] rounded-md shadow-lg">
        <div class="ws-table-column-menu-main p-1">
          <div class="ws-table-column-menu-search-wrap" @mouseenter="closeColorMenu">
            <Input
              v-model="searchQuery"
              class="ws-table-column-menu-search h-7 rounded-md px-2 text-[11px]"
              :placeholder="t('writingStudio.toolbar.table.columnMenu.search')"
            />
          </div>

          <div v-if="filteredTableActions.length > 0" class="ws-table-column-menu-items p-0.5">
            <template v-for="action in filteredTableActions" :key="action.id">
              <HoverCard
                v-if="action.id === 'textColor' || action.id === 'backgroundColor'"
                :open="activeColorMenuKind === (action.id === 'textColor' ? 'text' : 'background')"
                :open-delay="0"
                :close-delay="0"
	              @update:open="
	                  (value) => {
                      const colorKind = action.id === 'textColor' ? 'text' : 'background';
	                    if (value) {
	                      openColorMenu(colorKind);
	                      return;
	                    }

	                    if (activeColorMenuKind === colorKind) {
	                      closeColorMenu();
	                    }
	                  }
	                ">
                <HoverCardTrigger as-child>
                  <button
                    type="button"
                    class="ws-table-column-menu-item min-h-8 gap-1.5 rounded-md px-2 py-1.5 text-[11px]"
                    :class="{ 'ws-table-column-menu-item--active': activeColorMenuKind === (action.id === 'textColor' ? 'text' : 'background') }"
                    @mousedown.prevent
                    @mouseenter="openColorMenu(action.id === 'textColor' ? 'text' : 'background')"
                  >
                    <component :is="action.icon" class="ws-table-column-menu-icon h-3.5 w-3.5" />
                    <span class="flex-1 text-left">
                      {{ action.label }}
                    </span>
                    <ChevronRight class="h-3 w-3 opacity-65" />
                  </button>
                </HoverCardTrigger>

	                <HoverCardContent side="right" align="start" :side-offset="6" class="ws-table-color-menu w-[15rem] rounded-md p-0.5 shadow-lg">
	                  <div @pointerenter="openColorMenu(action.id === 'textColor' ? 'text' : 'background')">
	                    <ColorPanel
	                      :search-query="searchQuery"
                        :kinds="[action.id === 'textColor' ? 'text' : 'background']"
	                      @select="({ kind, value }) => applyColumnColor(kind, value)"
	                    />
	                  </div>
	                </HoverCardContent>
	              </HoverCard>

              <button
                v-else
                type="button"
                class="ws-table-column-menu-item min-h-8 gap-1.5 rounded-md px-2 py-1.5 text-[11px]"
                :class="{ 'ws-table-column-menu-item--danger': action.destructive }"
                @mousedown.prevent
                @mouseenter="closeColorMenu"
                @click="runColumnAction(action.id)"
              >
                <component :is="action.icon" class="ws-table-column-menu-icon h-3.5 w-3.5" />
                <span class="flex-1 text-left">
                  {{ action.label }}
                </span>
                <span v-if="action.hint" class="ws-table-column-menu-item-hint text-[10px]">
                  {{ action.hint }}
                </span>
              </button>
            </template>
          </div>

          <div v-else class="ws-table-column-menu-empty px-2 py-3 text-[11px]">
            {{ t("writingStudio.toolbar.table.columnMenu.empty") }}
          </div>
        </div>
      </Card>
    </div>
  </BubbleMenu>


</template>
