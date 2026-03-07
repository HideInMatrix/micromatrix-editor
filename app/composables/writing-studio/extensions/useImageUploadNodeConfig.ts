import type { ImageAlignValue } from "./useImageExtension";
import type { WritingStudioImageUploader } from "../actions/useOtherActions";
import { WritingStudioImageUploadNode } from "../nodes/useImageUploadNode";

type UseWritingStudioImageUploadNodeConfigOptions = {
  uploader?: WritingStudioImageUploader;
  isApiUploadEnabled?: boolean;
  maxFileSizeMb?: number;
  defaultAlign?: ImageAlignValue;
};

export const useWritingStudioImageUploadNodeConfig = (
  options?: UseWritingStudioImageUploadNodeConfigOptions,
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
