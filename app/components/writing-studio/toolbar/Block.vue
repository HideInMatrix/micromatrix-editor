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
import { useWritingStudioBlockActions } from "~/composables/writing-studio/actions/useBlockActions";
import { useWritingStudioToolbarState } from "~/composables/writing-studio/toolbar/useState";

const props = defineProps<{
  editor: Editor | null | undefined;
}>();

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const { dropdownItemClass, isNodeActive } = useWritingStudioToolbarState(editorRef);
const {
  toggleBlockquote,
  toggleDetails,
  setHardBreak,
  setHorizontalRule,
} = useWritingStudioBlockActions(editorRef);
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" :disabled="!editor" class="h-8 px-2 text-xs">
        {{ t("writingStudio.toolbar.groups.blockNodes") }}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-60">
      <DropdownMenuLabel>{{ t("writingStudio.toolbar.labels.nodeBlocks") }}</DropdownMenuLabel>
      <DropdownMenuItem
        :class="dropdownItemClass(isNodeActive('blockquote'))"
        :disabled="!editor"
        @select.prevent="toggleBlockquote"
      >
        {{ t("writingStudio.toolbar.block.blockquote") }}
      </DropdownMenuItem>
      <DropdownMenuItem
        :class="dropdownItemClass(isNodeActive('details'))"
        :disabled="!editor"
        @select.prevent="toggleDetails"
      >
        {{ t("writingStudio.toolbar.block.details") }}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem :disabled="!editor" @select.prevent="setHardBreak">
        {{ t("writingStudio.toolbar.block.hardBreak") }}
      </DropdownMenuItem>
      <DropdownMenuItem :disabled="!editor" @select.prevent="setHorizontalRule">
        {{ t("writingStudio.toolbar.block.horizontalRule") }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
