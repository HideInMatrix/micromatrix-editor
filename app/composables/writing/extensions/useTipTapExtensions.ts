import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { Emoji } from "@tiptap/extension-emoji";
import { Highlight } from "@tiptap/extension-highlight";
import { Mention } from "@tiptap/extension-mention";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { useTipTapCodeBlockLowlightExtension } from "./useTipTapCodeBlockLowlightExtension";
import { useTipTapLinkExtension } from "./useTipTapLinkExtension";
import { useTipTapMediaExtensions } from "./useTipTapMediaExtensions";
import { useMarkdownExtension } from "./useMarkdown";
import { useTipTapTableExtensions } from "./useTipTapTableExtensions";
import { useTipTapTwitchParent } from "./useTipTapTwitchParent";

export const useTipTapEditorPlugins = () => {
    const Markdown = useMarkdownExtension();
    const twitchParent = useTipTapTwitchParent();
    const codeBlockLowlightExtension = useTipTapCodeBlockLowlightExtension();
    const linkExtension = useTipTapLinkExtension();
    const mediaExtensions = useTipTapMediaExtensions(twitchParent);
    const tableExtensions = useTipTapTableExtensions();

    return [
        StarterKit.configure({
            codeBlock: false,
            link: false,
            underline: false,
        }),
        codeBlockLowlightExtension,
        Highlight.configure({
            multicolor: true,
        }),
        linkExtension,
        Subscript,
        Superscript,
        TextStyle.configure({
            HTMLAttributes: {
                class: "ws-text-style",
            },
        }),
        Details.configure({
            HTMLAttributes: {
                class: "ws-details",
            },
        }),
        DetailsSummary,
        DetailsContent,
        Emoji.configure({
            HTMLAttributes: {
                class: "ws-emoji",
            },
        }),
        Mention.configure({
            HTMLAttributes: {
                class: "ws-mention",
            },
        }),
        ...mediaExtensions,
        TaskList,
        TaskItem.configure({
            nested: true,
        }),
        TextAlign.configure({
            types: ["heading", "paragraph"],
            alignments: ["left", "center", "right", "justify"],
            defaultAlignment: "left",
        }),
        ...tableExtensions,
        Underline,
        Markdown,
    ]
}
