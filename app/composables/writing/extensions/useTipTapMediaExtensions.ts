import { Audio } from "@tiptap/extension-audio";
import { Twitch } from "@tiptap/extension-twitch";
import { Youtube } from "@tiptap/extension-youtube";
import { useWritingStudioImageApiUploader } from "../studio/useWritingStudioImageApiUploader";
import { useTipTapImageExtension } from "./useTipTapImageExtension";
import { useTipTapImageUploadNodeConfig } from "./useTipTapImageUploadNodeConfig";

export const useTipTapMediaExtensions = (twitchParent: string) => {
    const imageExtension = useTipTapImageExtension();
    const { uploader, isApiUploadEnabled } = useWritingStudioImageApiUploader();
    const imageUploadNodeExtension = useTipTapImageUploadNodeConfig({
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
