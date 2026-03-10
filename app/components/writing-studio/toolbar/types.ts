import type { Editor } from "@tiptap/vue-3";

export type ParagraphHeadingValue =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "heading5"
  | "heading6";

export type ListTypeValue = "bulletList" | "orderedList" | "taskList";

export type TextAlignValue = "left" | "center" | "right" | "justify";

export type ToolbarButtonClass = (active: boolean) => string;

export type ToolbarDropdownItemClass = (active?: boolean) => string;

export type ToolbarCanRun = (checker: (current: Editor) => boolean) => boolean;
