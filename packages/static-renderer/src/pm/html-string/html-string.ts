import type { Extensions, JSONContent } from "@mxm-editor/core";
import type {
  DOMOutputSpec,
  Mark as ProseMirrorMark,
  Node as ProseMirrorNode,
} from "@mxm-editor/pm";
import {
  renderJSONContentToString,
  serializeAttrsToHTMLString,
  serializeChildrenToHTMLString,
} from "../../json/html-string/string";
import type { TiptapStaticRendererOptions } from "../../json/renderer";
import { renderToElement } from "../extensionRenderer";

type DOMOutputSpecArray = readonly [string, ...any[]];

const NON_SELF_CLOSING_TAGS = new Set([
  "iframe",
  "script",
  "style",
  "title",
  "textarea",
  "div",
  "span",
  "a",
  "button",
]);

export {
  serializeAttrsToHTMLString,
  serializeChildrenToHTMLString,
} from "../../json/html-string/string";

export function domOutputSpecToHTMLString(
  content: DOMOutputSpec,
): (children?: string | string[]) => string {
  if (typeof content === "string") {
    return () => content;
  }

  if (typeof content === "object" && "length" in content) {
    const [_tag, attrs, children, ...rest] = content as DOMOutputSpecArray;
    let tag = _tag;
    const parts = tag.split(" ");

    if (parts.length > 1) {
      tag = `${parts[1]} xmlns="${parts[0]}"`;
    }

    if (attrs === undefined) {
      if (NON_SELF_CLOSING_TAGS.has(tag)) {
        return () => `<${tag}></${tag}>`;
      }

      return () => `<${tag}/>`;
    }

    if (attrs === 0) {
      return (child) => `<${tag}>${serializeChildrenToHTMLString(child)}</${tag}>`;
    }

    if (typeof attrs === "object") {
      if (Array.isArray(attrs)) {
        if (children === undefined || children === 0) {
          return (child) =>
            `<${tag}>${domOutputSpecToHTMLString(attrs as unknown as DOMOutputSpecArray)(child)}</${tag}>`;
        }

        return (child) =>
          `<${tag}>${domOutputSpecToHTMLString(attrs as unknown as DOMOutputSpecArray)(child)}${[
            children,
          ]
            .concat(rest)
            .map((item) => domOutputSpecToHTMLString(item)(child))
            .join("")}</${tag}>`;
      }

      if (children === undefined) {
        if (NON_SELF_CLOSING_TAGS.has(tag)) {
          return () => `<${tag}${serializeAttrsToHTMLString(attrs)}></${tag}>`;
        }

        return () => `<${tag}${serializeAttrsToHTMLString(attrs)}/>`;
      }

      if (children === 0) {
        return (child) =>
          `<${tag}${serializeAttrsToHTMLString(attrs)}>${serializeChildrenToHTMLString(child)}</${tag}>`;
      }

      return (child) =>
        `<${tag}${serializeAttrsToHTMLString(attrs)}>${[children]
          .concat(rest)
          .map((item) => domOutputSpecToHTMLString(item)(child))
          .join("")}</${tag}>`;
    }
  }

  throw new Error(
    "[mxm-editor]: Unsupported DOMOutputSpec type. Override nodeMapping/markMapping if needed.",
  );
}

export function renderToHTMLString({
  content,
  extensions,
  options,
}: {
  content: ProseMirrorNode | JSONContent;
  extensions: Extensions;
  options?: Partial<TiptapStaticRendererOptions<string, ProseMirrorMark, ProseMirrorNode>>;
}) {
  return renderToElement<string>({
    renderer: renderJSONContentToString,
    domOutputSpecToElement: domOutputSpecToHTMLString,
    mapDefinedTypes: {
      doc: ({ children }) => serializeChildrenToHTMLString(children),
      text: ({ node }) => node.text ?? "",
    },
    content,
    extensions,
    options,
  });
}
