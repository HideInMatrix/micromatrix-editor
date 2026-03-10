<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { Code2 } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWritingStudioBlockActions } from "~/composables/writing-studio/actions/useBlockActions";
import { useWritingStudioOtherActions } from "~/composables/writing-studio/actions/useOtherActions";
import { useWritingStudioToolbarState } from "~/composables/writing-studio/toolbar/useState";

const props = defineProps<{
  editor: Editor | null | undefined;
}>();

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const { dropdownItemClass, isMarkActive, isNodeActive } = useWritingStudioToolbarState(editorRef);
const { toggleCode } = useWritingStudioOtherActions(editorRef);
const { toggleCodeBlock } = useWritingStudioBlockActions(editorRef);
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" :disabled="!editor" class="h-8 px-2 text-xs">
        <Code2 />
        {{ t("writingStudio.toolbar.groups.codeNodes") }}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-56">
      <DropdownMenuLabel>{{ t("writingStudio.toolbar.labels.codeActions") }}</DropdownMenuLabel>
      <DropdownMenuItem
        :class="dropdownItemClass(isMarkActive('code'))"
        :disabled="!editor"
        @select.prevent="toggleCode"
      >
        {{ t("writingStudio.toolbar.marks.code") }}
      </DropdownMenuItem>
      <DropdownMenuItem
        :class="dropdownItemClass(isNodeActive('codeBlock'))"
        :disabled="!editor"
        @select.prevent="toggleCodeBlock"
      >
        {{ t("writingStudio.toolbar.block.codeBlock") }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
