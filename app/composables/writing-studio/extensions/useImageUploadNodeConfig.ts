import type { ImageAlignValue } from "./useImageExtension";
import type { WritingStudioImageUploader } from "../actions/useOtherActions";
import { WritingStudioImageUploadNode } from "../nodes/useImageUploadNode";

// 图片上传节点可覆盖的默认配置
type UseWritingStudioImageUploadNodeConfigOptions = {
  uploader?: WritingStudioImageUploader;
  isApiUploadEnabled?: boolean;
  maxFileSizeMb?: number;
  defaultAlign?: ImageAlignValue;
};

// 返回配置后的图片上传节点扩展
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
