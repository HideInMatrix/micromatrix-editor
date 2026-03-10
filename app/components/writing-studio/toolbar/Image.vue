<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import {
  ImagePlus,
  Link2,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useWritingStudioOtherActions } from "~/composables/writing-studio/actions/useOtherActions";

const props = defineProps<{
  editor: Editor | null | undefined;
}>();

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const { insertImageByUrl, insertImageUpload } = useWritingStudioOtherActions(editorRef);
const isLinkDialogOpen = ref(false);
const imageLink = ref("https://");

const openLinkDialog = () => {
  isLinkDialogOpen.value = true;
};

const closeLinkDialog = () => {
  isLinkDialogOpen.value = false;
};

const submitImageLink = () => {
  const url = imageLink.value.trim();

  if (!url) {
    return;
  }

  insertImageByUrl(url);
  closeLinkDialog();
};
</script>

<template>
  <Dialog v-model:open="isLinkDialogOpen">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="outline" size="sm" :disabled="!editor" class="h-8 px-2 text-xs">
          <ImagePlus />
          {{ t("writingStudio.toolbar.groups.imageNodes") }}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-56">
        <DropdownMenuLabel>{{ t("writingStudio.toolbar.labels.imageActions") }}</DropdownMenuLabel>
        <DropdownMenuItem :disabled="!editor" @select.prevent="insertImageUpload">
          <ImagePlus />
          {{ t("writingStudio.toolbar.image.upload") }}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem :disabled="!editor" @select.prevent="openLinkDialog">
          <Link2 />
          {{ t("writingStudio.toolbar.insert.imageByUrl") }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t("writingStudio.toolbar.image.linkDialogTitle") }}</DialogTitle>
        <DialogDescription>{{ t("writingStudio.toolbar.image.linkDialogDescription") }}</DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="submitImageLink">
        <Input
          v-model="imageLink"
          type="url"
          :placeholder="t('writingStudio.toolbar.image.linkInputPlaceholder')"
        />

        <DialogFooter>
          <Button type="button" variant="outline" @click="closeLinkDialog">
            {{ t("writingStudio.toolbar.image.cancel") }}
          </Button>
          <Button type="submit" :disabled="!editor || !imageLink.trim()">
            {{ t("writingStudio.toolbar.image.insertConfirm") }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
