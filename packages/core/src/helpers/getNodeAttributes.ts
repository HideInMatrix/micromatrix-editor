import type {
  EditorState,
  Node as ProseMirrorNode,
  NodeType,
} from "@mxm-editor/pm";
import { getNodeType } from "./getNodeType";

export function getNodeAttributes(
  state: EditorState,
  typeOrName: string | NodeType,
) {
  const type = getNodeType(typeOrName, state.schema);
  const { from, to } = state.selection;
  const nodes: ProseMirrorNode[] = [];

  state.doc.nodesBetween(from, to, (node) => {
    nodes.push(node);
    return true;
  });

  const node = nodes.reverse().find((item) => item.type === type);

  if (!node) {
    return {};
  }

  return {
    ...node.attrs,
  };
}
