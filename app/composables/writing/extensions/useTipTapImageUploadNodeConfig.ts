import type { ImageAlignValue } from "./useTipTapImageExtension";
import type { WritingStudioImageUploader } from "../studio/useWritingStudioOtherActions";
import { WritingStudioImageUploadNode } from "../nodes/useTipTapImageUploadNode";

type UseTipTapImageUploadNodeConfigOptions = {
  uploader?: WritingStudioImageUploader;
  isApiUploadEnabled?: boolean;
  maxFileSizeMb?: number;
  defaultAlign?: ImageAlignValue;
};

export const useTipTapImageUploadNodeConfig = (
  options?: UseTipTapImageUploadNodeConfigOptions,
) => {
  return WritingStudioImageUploadNode.configure({
    HTMLAttributes: {
      class: "ws-image-upload-node",
    },
    uploader: options?.uploader,
    isApiUploadEnabled: options?.isApiUploadEnabled ?? false,
    maxFileSizeMb: options?.maxFileSizeMb ?? 5,
    defaultAlign: options?.defaultAlign ?? "center",
  });
};
