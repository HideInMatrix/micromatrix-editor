<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWritingStudioOtherActions } from "~/composables/writing-studio/actions/useOtherActions";
import { useWritingStudioToolbarState } from "~/composables/writing-studio/toolbar/useState";

const props = defineProps<{
  editor: Editor | null | undefined;
}>();

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const { canRun } = useWritingStudioToolbarState(editorRef);
const {
  insertTable,
  addColumnBefore,
  addColumnAfter,
  deleteColumn,
  addRowBefore,
  addRowAfter,
  deleteRow,
  toggleHeaderRow,
  toggleHeaderColumn,
  mergeOrSplitCells,
  deleteTable,
} = useWritingStudioOtherActions(editorRef);
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" :disabled="!editor" class="h-8 px-2 text-xs">
        {{ t("writingStudio.toolbar.groups.tableNodes") }}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-64">
      <DropdownMenuLabel>{{ t("writingStudio.toolbar.labels.tableActions") }}</DropdownMenuLabel>
      <DropdownMenuItem :disabled="!editor" @select.prevent="insertTable">
        {{ t("writingStudio.toolbar.table.insert3x3") }}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        :disabled="!editor || !canRun((current) => current.can().addColumnBefore())"
        @select.prevent="addColumnBefore"
      >
        {{ t("writingStudio.toolbar.table.addColumnBefore") }}
      </DropdownMenuItem>
      <DropdownMenuItem
        :disabled="!editor || !canRun((current) => current.can().addColumnAfter())"
        @select.prevent="addColumnAfter"
      >
        {{ t("writingStudio.toolbar.table.addColumnAfter") }}
      </DropdownMenuItem>
      <DropdownMenuItem
        :disabled="!editor || !canRun((current) => current.can().deleteColumn())"
        @select.prevent="deleteColumn"
      >
        {{ t("writingStudio.toolbar.table.deleteColumn") }}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        :disabled="!editor || !canRun((current) => current.can().addRowBefore())"
        @select.prevent="addRowBefore"
      >
        {{ t("writingStudio.toolbar.table.addRowBefore") }}
      </DropdownMenuItem>
      <DropdownMenuItem
        :disabled="!editor || !canRun((current) => current.can().addRowAfter())"
        @select.prevent="addRowAfter"
      >
        {{ t("writingStudio.toolbar.table.addRowAfter") }}
      </DropdownMenuItem>
      <DropdownMenuItem
        :disabled="!editor || !canRun((current) => current.can().deleteRow())"
        @select.prevent="deleteRow"
      >
        {{ t("writingStudio.toolbar.table.deleteRow") }}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        :disabled="!editor || !canRun((current) => current.can().toggleHeaderRow())"
        @select.prevent="toggleHeaderRow"
      >
        {{ t("writingStudio.toolbar.table.toggleHeaderRow") }}
      </DropdownMenuItem>
      <DropdownMenuItem
        :disabled="!editor || !canRun((current) => current.can().toggleHeaderColumn())"
        @select.prevent="toggleHeaderColumn"
      >
        {{ t("writingStudio.toolbar.table.toggleHeaderColumn") }}
      </DropdownMenuItem>
      <DropdownMenuItem
        :disabled="!editor || !canRun((current) => current.can().mergeOrSplit())"
        @select.prevent="mergeOrSplitCells"
      >
        {{ t("writingStudio.toolbar.table.mergeSplitCells") }}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        :disabled="!editor || !canRun((current) => current.can().deleteTable())"
        @select.prevent="deleteTable"
      >
        {{ t("writingStudio.toolbar.table.deleteTable") }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
