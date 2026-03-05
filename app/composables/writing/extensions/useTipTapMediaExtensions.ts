import { Audio } from "@tiptap/extension-audio";
import { Twitch } from "@tiptap/extension-twitch";
import { Youtube } from "@tiptap/extension-youtube";
import { useTipTapImageExtension } from "./useTipTapImageExtension";

export const useTipTapMediaExtensions = (twitchParent: string) => {
    const imageExtension = useTipTapImageExtension();

    return [
        imageExtension,
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
