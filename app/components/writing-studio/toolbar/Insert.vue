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

const props = defineProps<{
  editor: Editor | null | undefined;
}>();

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const {
  insertAudio,
  insertYoutube,
  insertTwitch,
  insertEmoji,
  insertMention,
} = useWritingStudioOtherActions(editorRef);
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" :disabled="!editor" class="h-8 px-2 text-xs">
        {{ t("writingStudio.toolbar.groups.insertNodes") }}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-60">
      <DropdownMenuLabel>{{ t("writingStudio.toolbar.labels.mediaInline") }}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem :disabled="!editor" @select.prevent="insertAudio">
        {{ t("writingStudio.toolbar.insert.audio") }}
      </DropdownMenuItem>
      <DropdownMenuItem :disabled="!editor" @select.prevent="insertYoutube">
        {{ t("writingStudio.toolbar.insert.youtube") }}
      </DropdownMenuItem>
      <DropdownMenuItem :disabled="!editor" @select.prevent="insertTwitch">
        {{ t("writingStudio.toolbar.insert.twitch") }}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem :disabled="!editor" @select.prevent="insertEmoji">
        {{ t("writingStudio.toolbar.insert.emoji") }}
      </DropdownMenuItem>
      <DropdownMenuItem :disabled="!editor" @select.prevent="insertMention">
        {{ t("writingStudio.toolbar.insert.mention") }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
