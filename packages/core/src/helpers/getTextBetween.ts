import type { Node as ProseMirrorNode } from "@mxm-editor/pm";
import type {
  Range,
  TextSerializer,
} from "../types";

export function getTextBetween(
  startNode: ProseMirrorNode,
  range: Range,
  options: {
    blockSeparator?: string;
    textSerializers?: Record<string, TextSerializer>;
  } = {},
): string {
  const { from, to } = range;
  const {
    blockSeparator = "\n\n",
    textSerializers = {},
  } = options;
  let text = "";

  startNode.nodesBetween(from, to, (node, pos, parent, index) => {
    if (node.isBlock && pos > from) {
      text += blockSeparator;
    }

    const textSerializer = textSerializers[node.type.name];

    if (textSerializer) {
      if (parent) {
        text += textSerializer({
          node,
          pos,
          parent,
          index,
          range,
        });
      }

      return false;
    }

    if (node.isText) {
      text += node.text?.slice(Math.max(from, pos) - pos, to - pos) ?? "";
    }

    return undefined;
  });

  return text;
}
