import { Audio } from "@tiptap/extension-audio";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { Emoji } from "@tiptap/extension-emoji";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Mention } from "@tiptap/extension-mention";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextStyle } from "@tiptap/extension-text-style";
import { Twitch } from "@tiptap/extension-twitch";
import { Underline } from "@tiptap/extension-underline";
import { Youtube } from "@tiptap/extension-youtube";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { useMarkdownExtension } from "./useMarkdown";

const lowlight = createLowlight(common);

export const useTipTapEditorPlugins = () => {
    const Markdown = useMarkdownExtension();
    const twitchParent = import.meta.client ? window.location.hostname : "localhost";
    return [
        StarterKit.configure({
            codeBlock: false,
            link: false,
            underline: false,
        }),
        CodeBlockLowlight.configure({
            lowlight,
        }),
        Highlight.configure({
            multicolor: true,
        }),
        Link.configure({
            openOnClick: false,
            HTMLAttributes: {
                rel: "noopener noreferrer nofollow",
                target: "_blank",
            },
        }),
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
        Image.configure({
            allowBase64: true,
            HTMLAttributes: {
                class: "ws-media",
            },
        }),
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
        TaskList,
        TaskItem.configure({
            nested: true,
        }),
        Table.configure({
            resizable: true,
            HTMLAttributes: {
                class: "ws-table",
            },
        }),
        TableRow,
        TableHeader,
        TableCell,
        Underline,
        Markdown,
    ]
}
