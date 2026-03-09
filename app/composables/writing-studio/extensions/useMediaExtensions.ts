import { Audio } from "@tiptap/extension-audio";
import { Twitch } from "@tiptap/extension-twitch";
import { Youtube } from "@tiptap/extension-youtube";
import { useWritingStudioImageApiUploader } from "../image/useApiUploader";
import { useWritingStudioImageExtension } from "./useImageExtension";
import { useWritingStudioImageUploadNodeConfig } from "./useImageUploadNodeConfig";

// 媒体相关扩展（图片/上传占位/音视频）
export const useWritingStudioMediaExtensions = (twitchParent: string) => {
  const imageExtension = useWritingStudioImageExtension();
  const { uploader, isApiUploadEnabled } = useWritingStudioImageApiUploader();
  const imageUploadNodeExtension = useWritingStudioImageUploadNodeConfig({
    uploader,
    isApiUploadEnabled,
    maxFileSizeMb: 5,
    defaultAlign: "center",
  });

  return [
    imageExtension,
    imageUploadNodeExtension,
    Audio.configure({
      controls: true,
      HTMLAttributes: {
        class: "ws-media",
      },
    }),
    Youtube.configure({
      width: 720,
      height: 405,
      HTMLAttributes: {
        class: "ws-media",
      },
    }),
    Twitch.configure({
      parent: twitchParent,
      width: 720,
      height: 405,
      HTMLAttributes: {
        class: "ws-media",
      },
    }),
  ];
};
