import type {
  InsertImageFromFileOptions,
} from "./useWritingStudioOtherActions";

type UploadStatus = "uploading" | "success" | "error";
type UploadErrorCode = "invalid_type" | "file_too_large" | "insert_failed";

export type WritingStudioImageUploadItem = {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: UploadStatus;
  errorCode?: UploadErrorCode;
};

type InsertImageFromFileHandler = (
  file: File,
  options?: InsertImageFromFileOptions,
) => Promise<boolean>;

type UseWritingStudioImageUploadOptions = {
  insertImageFromFile: InsertImageFromFileHandler;
  uploader?: InsertImageFromFileOptions["uploader"];
  maxFiles?: number;
  maxFileSizeMb?: number;
};

const defaultMaxFiles = 3;
const defaultMaxFileSizeMb = 5;

const createUploadId = () => {
  const random = Math.random().toString(36).slice(2, 9);
  return `upload-${Date.now()}-${random}`;
};

const isImageFile = (file: File) => file.type.startsWith("image/");

export const useWritingStudioImageUpload = ({
  insertImageFromFile,
  uploader,
  maxFiles = defaultMaxFiles,
  maxFileSizeMb = defaultMaxFileSizeMb,
}: UseWritingStudioImageUploadOptions) => {
  const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;
  const imageUploadInputRef = ref<HTMLInputElement | null>(null);
  const isImageUploadPanelOpen = ref(false);
  const isImageUploadDragging = ref(false);
  const imageUploadItems = ref<WritingStudioImageUploadItem[]>([]);

  const formatImageUploadFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const updateImageUploadItem = (id: string, patch: Partial<WritingStudioImageUploadItem>) => {
    const target = imageUploadItems.value.find((item) => item.id === id);
    if (!target) {
      return;
    }

    Object.assign(target, patch);
  };

  const removeImageUploadItem = (id: string) => {
    imageUploadItems.value = imageUploadItems.value.filter((item) => item.id !== id);
  };

  const clearImageUploadItems = () => {
    imageUploadItems.value = [];
  };

  const openImageUploadPanel = () => {
    isImageUploadPanelOpen.value = true;
  };

  const closeImageUploadPanel = () => {
    isImageUploadPanelOpen.value = false;
  };

  const openImageUploadPicker = () => {
    openImageUploadPanel();
    imageUploadInputRef.value?.click();
  };

  const setItemProgress = (id: string, progress: number) => {
    const normalized = Math.max(0, Math.min(100, Math.round(progress)));
    updateImageUploadItem(id, { progress: normalized });
  };

  const addImageUploadItem = (file: File): WritingStudioImageUploadItem => {
    const item: WritingStudioImageUploadItem = {
      id: createUploadId(),
      name: file.name,
      size: file.size,
      progress: 0,
      status: "uploading",
    };

    imageUploadItems.value = [item, ...imageUploadItems.value];
    return item;
  };

  const processImageUpload = async (file: File) => {
    const item = addImageUploadItem(file);

    if (!isImageFile(file)) {
      updateImageUploadItem(item.id, {
        status: "error",
        progress: 0,
        errorCode: "invalid_type",
      });
      return;
    }

    if (file.size > maxFileSizeBytes) {
      updateImageUploadItem(item.id, {
        status: "error",
        progress: 0,
        errorCode: "file_too_large",
      });
      return;
    }

    const success = await insertImageFromFile(file, {
      uploader,
      onProgress: (progress) => {
        setItemProgress(item.id, progress);
      },
    });

    if (success) {
      updateImageUploadItem(item.id, {
        status: "success",
        progress: 100,
        errorCode: undefined,
      });
      return;
    }

    updateImageUploadItem(item.id, {
      status: "error",
      progress: 0,
      errorCode: "insert_failed",
    });
  };

  const queueImageUploads = async (files: File[]) => {
    const availableSlots = Math.max(0, maxFiles - imageUploadItems.value.length);
    if (availableSlots <= 0) {
      return;
    }

    const uploads = files.slice(0, availableSlots).map((file) => processImageUpload(file));
    await Promise.all(uploads);
  };

  const handleImageUploadChange = async (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    const files = target?.files ? Array.from(target.files) : [];

    if (files.length > 0) {
      await queueImageUploads(files);
    }

    if (target) {
      target.value = "";
    }
  };

  const handleImageUploadDragOver = (event: DragEvent) => {
    event.preventDefault();
    isImageUploadDragging.value = true;
  };

  const handleImageUploadDragLeave = (event: DragEvent) => {
    event.preventDefault();
    const nextTarget = event.relatedTarget as Node | null;
    const currentTarget = event.currentTarget as HTMLElement | null;
    if (currentTarget && nextTarget && currentTarget.contains(nextTarget)) {
      return;
    }

    isImageUploadDragging.value = false;
  };

  const handleImageUploadDrop = async (event: DragEvent) => {
    event.preventDefault();
    isImageUploadDragging.value = false;
    const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];

    if (files.length === 0) {
      return;
    }

    await queueImageUploads(files);
  };

  return {
    imageUploadInputRef,
    isImageUploadPanelOpen,
    isImageUploadDragging,
    imageUploadItems,
    maxImageUploadFiles: maxFiles,
    maxImageUploadFileSizeMb: maxFileSizeMb,
    formatImageUploadFileSize,
    openImageUploadPanel,
    closeImageUploadPanel,
    openImageUploadPicker,
    clearImageUploadItems,
    removeImageUploadItem,
    handleImageUploadChange,
    handleImageUploadDragOver,
    handleImageUploadDragLeave,
    handleImageUploadDrop,
  };
};
