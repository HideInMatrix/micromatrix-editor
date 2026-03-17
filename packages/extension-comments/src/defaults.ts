import type { CommentsClasses, CommentsOptions } from "./types";

export const defaultCommentsClasses: CommentsClasses = {
  thread: "tiptap-thread",
  threadInline: "tiptap-thread--inline",
  threadBlock: "tiptap-thread--block",
  threadHovered: "tiptap-thread--hovered",
  threadSelected: "tiptap-thread--selected",
  threadResolved: "tiptap-thread--resolved",
  threadUnresolved: "tiptap-thread--unresolved",
};

export function createDefaultCommentsOptions(): CommentsOptions {
  return {
    provider: null,
    document: null,
    field: "comments",
    classes: { ...defaultCommentsClasses },
    onClickThread: undefined,
    deleteUnreferencedThreads: true,
    useLegacyWrapping: true,
    markTypeName: "inlineThread",
  };
}
