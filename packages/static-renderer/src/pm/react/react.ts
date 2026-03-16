import React from "react";
import type { Extensions, JSONContent } from "@mxm-editor/core";
import type {
  DOMOutputSpec,
  Mark as ProseMirrorMark,
  Node as ProseMirrorNode,
} from "@mxm-editor/pm";
import { renderJSONContentToReactElement } from "../../json/react/react";
import type { TiptapStaticRendererOptions } from "../../json/renderer";
import { renderToElement } from "../extensionRenderer";

type DOMOutputSpecArray = readonly [string, ...any[]];

export function mapAttrsToHTMLAttributes(
  attrs?: Record<string, any>,
  key?: string,
): Record<string, any> {
  if (!attrs) {
    return { key };
  }

  return Object.entries(attrs).reduce(
    (acc, [name, value]) => {
      if (name === "class") {
        return Object.assign(acc, { className: value });
      }

      if (name === "style" && typeof value === "string") {
        const styleObject: Record<string, string> = {};

        value.split(";").forEach((style) => {
          const [styleKey, styleValue] = style.split(":");

          if (!styleKey || !styleValue) {
            return;
          }

          const camelCaseKey = styleKey
            .trim()
            .replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());

          styleObject[camelCaseKey] = styleValue.trim();
        });

        return Object.assign(acc, { style: styleObject });
      }

      return Object.assign(acc, { [name]: value });
    },
    { key } as Record<string, any>,
  );
}

export function domOutputSpecToReactElement(
  content: DOMOutputSpec,
  key = 0,
): (children?: React.ReactNode) => React.ReactNode {
  if (typeof content === "string") {
    return () => content;
  }

  if (typeof content === "object" && "length" in content) {
    let [tag, attrs, children, ...rest] = content as DOMOutputSpecArray;
    const parts = tag.split(" ");

    if (parts.length > 1) {
      tag = parts[1];

      if (attrs === undefined) {
        attrs = {
          xmlns: parts[0],
        };
      } else if (attrs === 0) {
        attrs = {
          xmlns: parts[0],
        };
        children = 0;
      } else if (typeof attrs === "object") {
        attrs = Object.assign(attrs, { xmlns: parts[0] });
      }
    }

    if (attrs === undefined) {
      return () => React.createElement(tag, mapAttrsToHTMLAttributes(undefined, key.toString()));
    }

    if (attrs === 0) {
      return (child) =>
        React.createElement(tag, mapAttrsToHTMLAttributes(undefined, key.toString()), child);
    }

    if (typeof attrs === "object") {
      if (Array.isArray(attrs)) {
        if (children === undefined || children === 0) {
          return (child) =>
            React.createElement(
              tag,
              mapAttrsToHTMLAttributes(undefined, key.toString()),
              domOutputSpecToReactElement(
                attrs as unknown as DOMOutputSpecArray,
                key += 1,
              )(child),
            );
        }

        return (child) =>
          React.createElement(
            tag,
            mapAttrsToHTMLAttributes(undefined, key.toString()),
            domOutputSpecToReactElement(
              attrs as unknown as DOMOutputSpecArray,
              key += 1,
            )(child),
            [children]
              .concat(rest)
              .map((outputSpec) => domOutputSpecToReactElement(outputSpec, key += 1)(child)),
          );
      }

      if (children === undefined) {
        return () => React.createElement(tag, mapAttrsToHTMLAttributes(attrs, key.toString()));
      }

      if (children === 0) {
        return (child) =>
          React.createElement(tag, mapAttrsToHTMLAttributes(attrs, key.toString()), child);
      }

      return (child) =>
        React.createElement(
          tag,
          mapAttrsToHTMLAttributes(attrs, key.toString()),
          [children]
            .concat(rest)
            .map((outputSpec) => domOutputSpecToReactElement(outputSpec, key += 1)(child)),
        );
    }
  }

  throw new Error(
    "[mxm-editor]: Unsupported DOMOutputSpec type. Override nodeMapping/markMapping if needed.",
  );
}

export function renderToReactElement({
  content,
  extensions,
  options,
}: {
  content: ProseMirrorNode | JSONContent;
  extensions: Extensions;
  options?: Partial<TiptapStaticRendererOptions<React.ReactNode, ProseMirrorMark, ProseMirrorNode>>;
}) {
  return renderToElement<React.ReactNode>({
    renderer: renderJSONContentToReactElement,
    domOutputSpecToElement: domOutputSpecToReactElement,
    mapDefinedTypes: {
      doc: ({ children }) => React.createElement(React.Fragment, {}, children),
      text: ({ node }) => node.text ?? "",
    },
    content,
    extensions,
    options,
  });
}
