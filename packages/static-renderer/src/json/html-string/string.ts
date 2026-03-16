import type { Mark as ProseMirrorMark, Node as ProseMirrorNode } from "@mxm-editor/pm";
import type { TiptapStaticRendererOptions } from "../renderer";
import { TiptapStaticRenderer } from "../renderer";

export function renderJSONContentToString<
  TMarkType extends { type: string | { name: string } } = ProseMirrorMark,
  TNodeType extends {
    content?: { forEach: (cb: (node: TNodeType) => void) => void };
    marks?: readonly { type: string | { name: string } }[];
    type: string | { name: string };
  } = ProseMirrorNode,
>(options: TiptapStaticRendererOptions<string, TMarkType, TNodeType>) {
  return TiptapStaticRenderer(
    (ctx) =>
      ctx.component(
        ctx.props as never,
      ),
    options,
  );
}

export function serializeAttrsToHTMLString(
  attrs: Record<string, any> | undefined | null,
) {
  const output = Object.entries(attrs ?? {})
    .map(([key, value]) => `${key.split(" ").at(-1)}=${JSON.stringify(value)}`)
    .join(" ");

  return output ? ` ${output}` : "";
}

export function serializeChildrenToHTMLString(children?: string | string[]) {
  return ([] as string[])
    .concat(children ?? "")
    .filter(Boolean)
    .join("");
}
