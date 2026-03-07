<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import type { Component } from "vue";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import { ArrowLeft, ArrowRight, ChevronRight, CircleX, Copy, GripHorizontal, PaintRoller, Square, Trash2, Type } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  clearWritingStudioTableColumnContent,
  deleteWritingStudioTableColumn,
  duplicateWritingStudioTableColumn,
  getWritingStudioTableColorPreset,
  insertWritingStudioTableColumn,
  isWritingStudioColumnSelectionActive,
  resolveWritingStudioActiveTableCell,
  resolveWritingStudioTableCellRect,
  resolveWritingStudioTableColumnRect,
  selectWritingStudioTableColumn,
  setWritingStudioTableColumnCellColors,
  useWritingStudioTableColumnColors,
  useWritingStudioTableColumnMenuState,
  type WritingStudioTableCellColorValue,
  type WritingStudioTableColorKind,
} from "~/composables/writing-studio/table/useColumnMenu";

const props = defineProps<{
  editor: Editor | null | undefined;
  container: HTMLElement | null;
}>();

type TableColumnActionId = "color" | "insertLeft" | "insertRight" | "duplicate" | "clear" | "delete";

type TableColumnActionItem = {
  id: TableColumnActionId;
  icon: Component;
  label: string;
  keyword: string;
  hint?: string;
  destructive?: boolean;
};

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const containerRef = computed(() => props.container);
const bubbleMenuAppendTarget = computed(() => containerRef.value ?? undefined);
const handleAnchorRef = useTemplateRef<HTMLElement>("handleAnchor");
const isMenuOpen = ref(false);
const isColorMenuOpen = ref(false);
const searchQuery = ref("");
const { activeCell, isColumnSelection } = useWritingStudioTableColumnMenuState(editorRef);
const colorPresets = useWritingStudioTableColumnColors();

const openColorMenu = () => {
  isColorMenuOpen.value = true;
};

const closeColorMenu = () => {
  isColorMenuOpen.value = false;
};

const closeColumnMenu = () => {
  isMenuOpen.value = false;
  isColorMenuOpen.value = false;
  searchQuery.value = "";
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

const hasFilteredColors = computed(() => {
  return filteredTextColorEntries.value.length > 0 || filteredBackgroundColorEntries.value.length > 0;
});

const tableColumnActions = computed<TableColumnActionItem[]>(() => {
  return [
    {
      id: "color",
      icon: PaintRoller,
      label: t("writingStudio.toolbar.table.columnMenu.color"),
      keyword: "color palette text background",
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
      id: "duplicate",
      icon: Copy,
      label: t("writingStudio.toolbar.table.columnMenu.duplicate"),
      keyword: "duplicate copy clone",
      hint: "⌘D",
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
    if (action.id === "color") {
      return action.label.toLowerCase().includes(query) || action.keyword.includes(query) || hasFilteredColors.value;
    }

    return action.label.toLowerCase().includes(query) || action.keyword.includes(query);
  });
});

watch(activeCell, (cell) => {
  if (!cell) {
    closeColumnMenu();
  }
});

watch(isColumnSelection, (value) => {
  if (!value && isMenuOpen.value) {
    closeColumnMenu();
  }
});

watch(
  [editorRef, isMenuOpen],
  ([editor, menuOpen]) => {
    const editorDom = editor?.view.dom as HTMLElement | undefined;

    if (!editorDom) {
      return;
    }

    if (menuOpen) {
      editorDom.setAttribute("data-ws-column-menu-active", "true");
      return;
    }

    editorDom.removeAttribute("data-ws-column-menu-active");
  },
  {
    immediate: true,
  },
);

const activeOutlineRect = computed(() => {
  const currentCell = activeCell.value;

  if (!currentCell) {
    return null;
  }

  if (isMenuOpen.value || isWritingStudioColumnSelectionActive(props.editor)) {
    return resolveWritingStudioTableColumnRect(props.editor, currentCell);
  }

  return resolveWritingStudioTableCellRect(currentCell);
});

const activeOutlineStyle = computed(() => {
  const rect = activeOutlineRect.value;
  const container = containerRef.value;

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
  const container = containerRef.value;

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
  if (!isMenuOpen.value || !props.editor || !isWritingStudioColumnSelectionActive(props.editor)) {
    return null;
  }

  const handleAnchor = handleAnchorRef.value;

  if (handleAnchor) {
    return {
      contextElement: handleAnchor,
      getBoundingClientRect: () => handleAnchor.getBoundingClientRect(),
    };
  }

  const rect = activeOutlineRect.value;

  if (!rect || !props.container || !import.meta.client) {
    return null;
  }

  return {
    contextElement: props.container,
    getBoundingClientRect: () => new DOMRect(rect.left + rect.width / 2, rect.top, 0, 0),
  };
};

const openColumnMenu = () => {
  if (!props.editor || !activeCell.value) {
    return;
  }

  const selected = selectWritingStudioTableColumn(props.editor, activeCell.value);

  if (!selected) {
    return;
  }

  isColorMenuOpen.value = false;
  isMenuOpen.value = true;
};

const shouldShowColumnMenu = (menuProps: any) => {
  const currentEditor = menuProps?.editor as Editor | undefined;

  if (!currentEditor?.isEditable) {
    return false;
  }

  if (!isMenuOpen.value) {
    return false;
  }

  if (!isWritingStudioColumnSelectionActive(currentEditor)) {
    closeColumnMenu();
    return false;
  }

  const currentCell = resolveWritingStudioActiveTableCell(currentEditor);
  if (!currentCell) {
    closeColumnMenu();
    return false;
  }

  return true;
};

const runColumnAction = (actionId: TableColumnActionId) => {
  if (!props.editor || !activeCell.value) {
    return;
  }

  if (actionId === "color") {
    openColorMenu();
    return;
  }

  closeColorMenu();

  if (actionId === "insertLeft") {
    insertWritingStudioTableColumn(props.editor, activeCell.value, "before");
    closeColumnMenu();
    return;
  }

  if (actionId === "insertRight") {
    insertWritingStudioTableColumn(props.editor, activeCell.value, "after");
    closeColumnMenu();
    return;
  }

  if (actionId === "duplicate") {
    duplicateWritingStudioTableColumn(props.editor, activeCell.value);
    closeColumnMenu();
    return;
  }

  if (actionId === "clear") {
    clearWritingStudioTableColumnContent(props.editor, activeCell.value);
    closeColumnMenu();
    return;
  }

  deleteWritingStudioTableColumn(props.editor, activeCell.value);
  closeColumnMenu();
};

const applyColumnColor = (kind: WritingStudioTableColorKind, value: WritingStudioTableCellColorValue) => {
  if (!props.editor || !activeCell.value) {
    return;
  }

  const preset = getWritingStudioTableColorPreset(kind, value);

  setWritingStudioTableColumnCellColors(props.editor, activeCell.value, {
    textColor: kind === "text" ? preset.textColor : undefined,
    backgroundColor: kind === "background" ? preset.backgroundColor : undefined,
  });

  closeColorMenu();
};
</script>

<template>
  <div v-if="handleStyle" ref="handleAnchor" class="ws-table-column-handle-anchor" :style="handleStyle">
    <Button
      type="button"
      variant="outline"
      class="ws-table-column-handle"
      :class="{ 'ws-table-column-handle--active': isMenuOpen }"
      :aria-label="t('writingStudio.toolbar.table.columnMenu.handle')"
      @mousedown.prevent
      @click="openColumnMenu">
      <GripHorizontal class="ws-table-column-handle-icon" />
    </Button>
  </div>
  <div v-if="activeOutlineStyle" class="ws-table-column-selection z-1" :style="activeOutlineStyle">
    <div class="ws-table-column-selection-outline" :class="{ 'ws-table-column-selection-outline--column': isMenuOpen || isColumnSelection }" />
  </div>
  <BubbleMenu
    v-if="editor && activeCell"
    plugin-key="writing-studio-table-column-menu"
    class="z-2"
    :editor="editor"
    :append-to="bubbleMenuAppendTarget"
    :should-show="shouldShowColumnMenu"
    :get-referenced-virtual-element="getColumnMenuVirtualElement"
    :options="{ placement: 'bottom-start', strategy: 'fixed', offset: 14 }">
    <div class="ws-table-column-bubble-layer">
      <Card class="ws-table-column-menu">
        <div class="ws-table-column-menu-main">
          <div class="ws-table-column-menu-search-wrap" @mouseenter="closeColorMenu">
            <Input v-model="searchQuery" class="ws-table-column-menu-search" :placeholder="t('writingStudio.toolbar.table.columnMenu.search')" />
          </div>

          <div v-if="filteredTableActions.length > 0" class="ws-table-column-menu-items">
            <template v-for="action in filteredTableActions" :key="action.id">
              <HoverCard
                v-if="action.id === 'color'"
                :open="isColorMenuOpen"
                :open-delay="0"
                :close-delay="0"
                @update:open="
                  (value) => {
                    if (value) openColorMenu();
                  }
                ">
                <HoverCardTrigger as-child>
                  <button type="button" class="ws-table-column-menu-item" :class="{ 'ws-table-column-menu-item--active': isColorMenuOpen }" @mousedown.prevent @mouseenter="openColorMenu">
                    <component :is="action.icon" class="ws-table-column-menu-icon" />
                    <span class="flex-1 text-left">
                      {{ action.label }}
                    </span>
                    <ChevronRight class="h-4 w-4 opacity-65" />
                  </button>
                </HoverCardTrigger>

                <HoverCardContent side="right" align="start" :side-offset="12" class="ws-table-column-color-menu" @pointerenter="openColorMenu">
                  <ScrollArea class="ws-table-column-color-scroll">
                    <div v-if="filteredTextColorEntries.length > 0" class="ws-table-column-color-section">
                      <div class="ws-table-column-color-title">
                        {{ t("writingStudio.toolbar.table.columnMenu.colors.text.title") }}
                      </div>

                      <button v-for="[value, preset] in filteredTextColorEntries" :key="`text-${value}`" type="button" class="ws-table-column-color-item" @mousedown.prevent @click="applyColumnColor('text', value)">
                        <span class="ws-table-column-color-swatch" :style="{ color: preset.textColor ?? 'oklch(var(--foreground))' }">
                          <Type class="h-6 w-6" />
                        </span>
                        <span>{{ t(preset.labelKey) }}</span>
                      </button>
                    </div>

                    <Separator v-if="filteredTextColorEntries.length > 0 && filteredBackgroundColorEntries.length > 0" class="my-3" />

                    <div v-if="filteredBackgroundColorEntries.length > 0" class="ws-table-column-color-section">
                      <div class="ws-table-column-color-title">
                        {{ t("writingStudio.toolbar.table.columnMenu.colors.background.title") }}
                      </div>

                      <button v-for="[value, preset] in filteredBackgroundColorEntries" :key="`background-${value}`" type="button" class="ws-table-column-color-item" @mousedown.prevent @click="applyColumnColor('background', value)">
                        <span class="ws-table-column-color-swatch" :style="{ color: preset.backgroundColor ?? 'oklch(var(--muted-foreground))' }">
                          <Square class="h-6 w-6 fill-current" />
                        </span>
                        <span>{{ t(preset.labelKey) }}</span>
                      </button>
                    </div>
                  </ScrollArea>
                </HoverCardContent>
              </HoverCard>

              <button v-else type="button" class="ws-table-column-menu-item" :class="{ 'ws-table-column-menu-item--danger': action.destructive }" @mousedown.prevent @mouseenter="closeColorMenu" @click="runColumnAction(action.id)">
                <component :is="action.icon" class="ws-table-column-menu-icon" />
                <span class="flex-1 text-left">
                  {{ action.label }}
                </span>
                <span v-if="action.hint" class="ws-table-column-menu-item-hint">
                  {{ action.hint }}
                </span>
              </button>
            </template>
          </div>

          <div v-else class="ws-table-column-menu-empty">
            {{ t("writingStudio.toolbar.table.columnMenu.empty") }}
          </div>
        </div>
      </Card>
    </div>
  </BubbleMenu>


</template>
