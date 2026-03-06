<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import {
  Check,
  Copy,
  ExternalLink,
  PencilLine,
  Trash2,
} from "lucide-vue-next";
import { onBeforeUnmount } from "vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  getWritingStudioActiveLinkState,
  type WritingStudioActiveLinkState,
} from "~/composables/writing/studio/useWritingStudioLinkState";

const props = defineProps<{
  editor: Editor | null | undefined;
  isEditing: boolean;
  href: string;
  text: string;
  canRemove: boolean;
}>();

const emit = defineEmits<{
  (event: "edit-link", link: WritingStudioActiveLinkState | null): void;
  (event: "update:href", value: string): void;
  (event: "update:text", value: string): void;
  (event: "save-link"): void;
  (event: "cancel-link-edit"): void;
  (event: "remove-link"): void;
}>();

const { t } = useI18n();
const copied = ref(false);
const lastLinkState = ref<WritingStudioActiveLinkState | null>(null);

let copiedTimer: ReturnType<typeof setTimeout> | null = null;

const activeLinkState = computed(() => {
  const current = getWritingStudioActiveLinkState(props.editor);
  if (current) {
    lastLinkState.value = current;
    return current;
  }

  return props.isEditing ? null : lastLinkState.value;
});

const shouldShowLinkMenu = ({ editor: currentEditor }: any) => {
  if (!currentEditor.isEditable) {
    return false;
  }

  return props.isEditing || currentEditor.isActive("link");
};

const preventReadonlyMenuMouseDown = (event: MouseEvent) => {
  if (props.isEditing) {
    return;
  }

  event.preventDefault();
};

const openLink = () => {
  const href = activeLinkState.value?.href;
  if (!href || !import.meta.client) {
    return;
  }

  window.open(href, "_blank", "noopener,noreferrer");
};

const copyLink = async () => {
  const href = activeLinkState.value?.href;
  if (!href || !import.meta.client) {
    return;
  }

  try {
    await navigator.clipboard.writeText(href);
    copied.value = true;

    if (copiedTimer) {
      clearTimeout(copiedTimer);
    }

    copiedTimer = setTimeout(() => {
      copied.value = false;
    }, 1200);
  } catch {
    copied.value = false;
  }
};

onBeforeUnmount(() => {
  if (!copiedTimer) {
    return;
  }

  clearTimeout(copiedTimer);
});
</script>

<template>
  <BubbleMenu
    v-if="editor"
    plugin-key="writing-studio-link-menu"
    :editor="editor"
    :should-show="shouldShowLinkMenu"
    :options="{ placement: 'top', offset: 10 }"
  >
    <Card
      class="ws-link-menu"
      :class="{ 'ws-link-menu--editing': isEditing }"
      @mousedown="preventReadonlyMenuMouseDown"
    >
      <CardContent v-if="!isEditing" class="ws-link-menu-content">
        <Button
          variant="ghost"
          size="icon-sm"
          class="ws-link-menu-icon"
          :title="t('writingStudio.toolbar.link.open')"
          :aria-label="t('writingStudio.toolbar.link.open')"
          @mousedown.prevent
          @click="openLink"
        >
          <ExternalLink />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          class="ws-link-menu-preview h-8 flex-1 justify-start px-1 text-sm font-normal"
          :title="activeLinkState?.href ?? ''"
          @mousedown.prevent
          @click="openLink"
        >
          <span class="ws-link-menu-text">
            {{ activeLinkState?.text ?? activeLinkState?.href ?? "" }}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          class="ws-link-menu-icon"
          :title="copied ? t('writingStudio.toolbar.link.copied') : t('writingStudio.toolbar.link.copy')"
          :aria-label="copied ? t('writingStudio.toolbar.link.copied') : t('writingStudio.toolbar.link.copy')"
          @mousedown.prevent
          @click="copyLink"
        >
          <Check v-if="copied" />
          <Copy v-else />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          class="ws-link-menu-edit"
          @mousedown.prevent
          @click="emit('edit-link', activeLinkState)"
        >
          <PencilLine />
          {{ t("writingStudio.toolbar.link.edit") }}
        </Button>
      </CardContent>

      <CardContent v-else class="ws-link-editor-content">
        <form class="ws-link-editor-form" @submit.prevent="emit('save-link')">
          <div class="ws-link-editor-field">
            <Label class="ws-link-editor-label" for="writing-studio-link-url">
              {{ t("writingStudio.toolbar.link.urlLabel") }}
            </Label>
            <Input
              id="writing-studio-link-url"
              :model-value="href"
              type="url"
              autofocus
              class="ws-link-editor-input"
              :placeholder="t('writingStudio.toolbar.link.inputPlaceholder')"
              @update:model-value="emit('update:href', String($event ?? ''))"
              @keydown.escape.stop.prevent="emit('cancel-link-edit')"
            />
          </div>

          <div class="ws-link-editor-field">
            <Label class="ws-link-editor-label" for="writing-studio-link-title">
              {{ t("writingStudio.toolbar.link.titleLabel") }}
            </Label>
            <Input
              id="writing-studio-link-title"
              :model-value="text"
              type="text"
              class="ws-link-editor-input"
              :placeholder="t('writingStudio.toolbar.link.titlePlaceholder')"
              @update:model-value="emit('update:text', String($event ?? ''))"
              @keydown.escape.stop.prevent="emit('cancel-link-edit')"
            />
          </div>

          <Separator class="ws-link-editor-separator" />

          <div class="ws-link-editor-actions">
            <Button
              v-if="canRemove"
              type="button"
              variant="ghost"
              class="ws-link-editor-remove"
              @click="emit('remove-link')"
            >
              <Trash2 />
              {{ t("writingStudio.toolbar.link.remove") }}
            </Button>

            <div class="ws-link-editor-submit">
              <Button type="button" variant="ghost" size="sm" @click="emit('cancel-link-edit')">
                {{ t("writingStudio.toolbar.link.cancel") }}
              </Button>
              <Button type="submit" size="sm">
                {{ t("writingStudio.toolbar.link.save") }}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  </BubbleMenu>
</template>
