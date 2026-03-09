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
import { useWritingStudioCodeBlockLowlightExtension } from "./useCodeBlockLowlightExtension";
import { useWritingStudioLinkExtension } from "./useLinkExtension";
import { useWritingStudioMediaExtensions } from "./useMediaExtensions";
import { useMarkdownExtension } from "./useMarkdown";
import { useWritingStudioTableExtensions } from "./useTableExtensions";
import { useWritingStudioTwitchParent } from "./useTwitchParent";

// 聚合写作编辑器全部扩展
export const useWritingStudioExtensions = () => {
  const markdown = useMarkdownExtension();
  const twitchParent = useWritingStudioTwitchParent();
  const codeBlockLowlightExtension = useWritingStudioCodeBlockLowlightExtension();
  const linkExtension = useWritingStudioLinkExtension();
  const mediaExtensions = useWritingStudioMediaExtensions(twitchParent);
  const tableExtensions = useWritingStudioTableExtensions();

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
    markdown,
  ];
};
