<script setup lang="ts">
import { NodeViewWrapper } from "@tiptap/vue-3";
import type { NodeViewProps } from "@tiptap/vue-3";
import { Button } from "@/components/ui/button";
import {
  CloudUpload,
  FileImage,
  LoaderCircle,
  X,
} from "lucide-vue-next";
import type { WritingStudioImageUploader } from "~/composables/writing/studio/useWritingStudioOtherActions";

type UploadStatus = "idle" | "uploading" | "error";

const props = defineProps<NodeViewProps>();
const { t } = useI18n();
const inputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const uploadStatus = ref<UploadStatus>("idle");
const uploadProgress = ref(0);
const fileName = ref("");
const fileSize = ref(0);
const errorMessage = ref("");

const uploader = computed(() => props.extension.options.uploader as WritingStudioImageUploader | undefined);
const isApiUploadEnabled = computed(() => Boolean(props.extension.options.isApiUploadEnabled));
const maxFileSizeMb = computed(() => {
  const value = Number(props.extension.options.maxFileSizeMb ?? 5);
  return Number.isFinite(value) && value > 0 ? value : 5;
});
const maxFileSizeBytes = computed(() => maxFileSizeMb.value * 1024 * 1024);

const formatFileSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const openPicker = () => {
  inputRef.value?.click();
};

const resetUploadState = () => {
  uploadStatus.value = "idle";
  uploadProgress.value = 0;
  fileName.value = "";
  fileSize.value = 0;
  errorMessage.value = "";
};

const readAsDataUrl = (file: File, onProgress?: (progress: number) => void) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) {
        return;
      }

      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress(percent);
    };

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Invalid image data"));
        return;
      }

      onProgress?.(100);
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read image"));
    };

    reader.readAsDataURL(file);
  });

const replaceWithImage = (attrs: Record<string, unknown>) => {
  if (typeof props.getPos !== "function") {
    return false;
  }

  const pos = props.getPos();
  if (typeof pos !== "number") {
    return false;
  }

  return props.editor
    .chain()
    .focus()
    .insertContentAt({ from: pos, to: pos + props.node.nodeSize }, {
      type: "image",
      attrs,
    })
    .run();
};

const uploadFile = async (file: File) => {
  if (!file.type.startsWith("image/")) {
    uploadStatus.value = "error";
    errorMessage.value = t("writingStudio.toolbar.image.uploadErrorInvalidType");
    return;
  }

  if (file.size > maxFileSizeBytes.value) {
    uploadStatus.value = "error";
    errorMessage.value = t("writingStudio.toolbar.image.uploadErrorFileSize", {
      size: maxFileSizeMb.value,
    });
    return;
  }

  fileName.value = file.name;
  fileSize.value = file.size;
  uploadStatus.value = "uploading";
  uploadProgress.value = 0;
  errorMessage.value = "";

  try {
    let imageSrc = "";
    let imageAlt = file.name || undefined;
    let imageTitle: string | undefined;

    if (uploader.value) {
      const uploaded = await uploader.value(file, (progress) => {
        uploadProgress.value = Math.max(0, Math.min(100, Math.round(progress)));
      });

      if (typeof uploaded === "string") {
        imageSrc = uploaded;
      } else {
        imageSrc = uploaded.src;
        imageAlt = uploaded.alt ?? imageAlt;
        imageTitle = uploaded.title;
      }
    } else {
      imageSrc = await readAsDataUrl(file, (progress) => {
        uploadProgress.value = progress;
      });
    }

    if (!imageSrc) {
      throw new Error("Empty image source");
    }

    const success = replaceWithImage({
      src: imageSrc,
      alt: imageAlt,
      title: imageTitle,
      align: props.extension.options.defaultAlign,
    });

    if (!success) {
      throw new Error("Failed to insert image node");
    }
  } catch {
    uploadStatus.value = "error";
    errorMessage.value = t("writingStudio.toolbar.image.uploadStatusFailed");
  }
};

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0];

  if (!file) {
    return;
  }

  await uploadFile(file);

  if (target) {
    target.value = "";
  }
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  const currentTarget = event.currentTarget as HTMLElement | null;
  const nextTarget = event.relatedTarget as Node | null;
  if (currentTarget && nextTarget && currentTarget.contains(nextTarget)) {
    return;
  }

  isDragging.value = false;
};

const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];

  if (!file) {
    return;
  }

  await uploadFile(file);
};

const removeNode = () => {
  props.deleteNode();
};
</script>

<template>
  <NodeViewWrapper as="div" class="ws-image-upload-node-view" data-drag-handle>
    <input
      ref="inputRef"
      type="file"
      class="hidden"
      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
      @change="handleFileSelect"
    >

    <template v-if="uploadStatus === 'idle'">
      <button
        type="button"
        class="ws-image-upload-node-dropzone"
        :class="{ 'is-dragging': isDragging }"
        @click="openPicker"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <FileImage class="ws-image-upload-node-dropzone-icon" />
        <span class="ws-image-upload-node-dropzone-title">
          {{ t("writingStudio.toolbar.image.uploadAreaTitle") }}
        </span>
        <span class="ws-image-upload-node-dropzone-hint">
          {{ t("writingStudio.toolbar.image.uploadAreaHint", { count: 1, size: maxFileSizeMb }) }}
        </span>
      </button>
    </template>

    <template v-else>
      <div class="ws-image-upload-node-item">
        <div class="ws-image-upload-node-item-main">
          <div class="ws-image-upload-node-item-leading">
            <CloudUpload class="ws-image-upload-node-item-icon" />
          </div>

          <div class="ws-image-upload-node-item-body">
            <div class="ws-image-upload-node-item-name">{{ fileName }}</div>
            <div class="ws-image-upload-node-item-meta">
              <span>{{ formatFileSize(fileSize) }}</span>
              <span class="ws-image-upload-node-item-status">
                <LoaderCircle
                  v-if="uploadStatus === 'uploading'"
                  :size="12"
                  class="animate-spin"
                />
                <X v-if="uploadStatus === 'error'" :size="12" />
                {{ uploadStatus === "error" ? errorMessage : `${uploadProgress}%` }}
              </span>
            </div>
            <div class="ws-image-upload-node-item-progress-track">
              <div
                class="ws-image-upload-node-item-progress-fill"
                :class="{ 'is-error': uploadStatus === 'error' }"
                :style="{ width: `${uploadProgress}%` }"
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            :title="t('writingStudio.toolbar.image.uploadCancel')"
            :aria-label="t('writingStudio.toolbar.image.uploadCancel')"
            @click="removeNode"
          >
            <X :size="14" />
          </Button>
        </div>

        <div v-if="uploadStatus === 'error'" class="ws-image-upload-node-actions">
          <Button variant="outline" size="sm" class="h-8 px-2 text-xs" @click="openPicker">
            {{ t("writingStudio.toolbar.image.uploadRetry") }}
          </Button>
          <Button variant="ghost" size="sm" class="h-8 px-2 text-xs" @click="resetUploadState">
            {{ t("writingStudio.toolbar.image.uploadReset") }}
          </Button>
        </div>
      </div>
    </template>

    <p class="ws-image-upload-node-mode">
      {{
        isApiUploadEnabled
          ? t("writingStudio.toolbar.image.uploadModeApi")
          : t("writingStudio.toolbar.image.uploadModeLocal")
      }}
    </p>
  </NodeViewWrapper>
</template>
