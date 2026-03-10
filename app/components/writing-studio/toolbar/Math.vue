<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWritingStudioOtherActions } from "~/composables/writing-studio/actions/useOtherActions";

const props = defineProps<{
  editor: Editor | null | undefined;
}>();

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const { insertInlineMath, insertBlockMath } = useWritingStudioOtherActions(editorRef);
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" :disabled="!editor" class="h-8 px-2 text-xs">
        {{ t("writingStudio.toolbar.groups.mathNodes") }}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-60">
      <DropdownMenuLabel>{{ t("writingStudio.toolbar.labels.mathActions") }}</DropdownMenuLabel>
      <DropdownMenuItem :disabled="!editor" @select.prevent="insertInlineMath">
        {{ t("writingStudio.toolbar.insert.inlineMath") }}
      </DropdownMenuItem>
      <DropdownMenuItem :disabled="!editor" @select.prevent="insertBlockMath">
        {{ t("writingStudio.toolbar.insert.blockMath") }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
