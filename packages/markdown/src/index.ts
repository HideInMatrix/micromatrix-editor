import type { AnyExtension, JSONContent } from "@mxm-editor/core";
import type { Node as ProseMirrorNode } from "@mxm-editor/pm";
import { MarkdownManager } from "./MarkdownManager";

export { MarkdownManager } from "./MarkdownManager";
export { Markdown, type MarkdownOptions, type MarkdownStorage } from "./markdown";

export function generateMarkdown(
  content: JSONContent | ProseMirrorNode,
  extensions: AnyExtension[],
) {
  return new MarkdownManager({ extensions }).serialize(content);
}

export function createDocumentFromMarkdown(
  markdown: string,
  extensions: AnyExtension[],
) {
  return new MarkdownManager({ extensions }).parse(markdown);
}
