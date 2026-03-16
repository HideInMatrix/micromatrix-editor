import React from "react";
import type { Mark as ProseMirrorMark, Node as ProseMirrorNode } from "@mxm-editor/pm";
import type { TiptapStaticRendererOptions } from "../renderer";
import { TiptapStaticRenderer } from "../renderer";

export function renderJSONContentToReactElement<
  TMarkType extends { type: string | { name: string } } = ProseMirrorMark,
  TNodeType extends {
    content?: { forEach: (cb: (node: TNodeType) => void) => void };
    marks?: readonly { type: string | { name: string } }[];
    type: string | { name: string };
  } = ProseMirrorNode,
>(options: TiptapStaticRendererOptions<React.ReactNode, TMarkType, TNodeType>) {
  let key = 0;

  return TiptapStaticRenderer<React.ReactNode, TMarkType, TNodeType>(
    ({ component, props: { children, ...props } }) =>
      React.createElement(
        component as React.FC<typeof props>,
        Object.assign(props, { key: key += 1 }),
        ([] as React.ReactNode[]).concat(children ?? []),
      ),
    options,
  );
}
