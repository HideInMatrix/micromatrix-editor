<script setup lang="ts">
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

withDefaults(defineProps<{
  disabled?: boolean;
}>(), {
  disabled: false,
});

const emit = defineEmits<{
  (event: "insert-upload"): void;
  (event: "insert-link", url: string): void;
}>();

const { t } = useI18n();
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

  emit("insert-link", url);
  closeLinkDialog();
};
</script>

<template>
  <Dialog v-model:open="isLinkDialogOpen">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="outline" size="sm" :disabled="disabled" class="h-8 px-2 text-xs">
          <ImagePlus />
          {{ t("writingStudio.toolbar.groups.imageNodes") }}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-56">
        <DropdownMenuLabel>{{ t("writingStudio.toolbar.labels.imageActions") }}</DropdownMenuLabel>
        <DropdownMenuItem :disabled="disabled" @select.prevent="emit('insert-upload')">
          <ImagePlus />
          {{ t("writingStudio.toolbar.image.upload") }}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem :disabled="disabled" @select.prevent="openLinkDialog">
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
          <Button type="submit" :disabled="!imageLink.trim()">
            {{ t("writingStudio.toolbar.image.insertConfirm") }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
