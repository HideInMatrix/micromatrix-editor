import type {
  EditorState,
  Node as ProseMirrorNode,
  NodeType,
} from "@mxm-editor/pm";
import { getNodeType } from "./getNodeType";

export function getNodeAtPosition(
  state: EditorState,
  typeOrName: string | NodeType,
  position: number,
  maxDepth = 20,
): [ProseMirrorNode | null, number] {
  const type = getNodeType(typeOrName, state.schema);
  const $position = state.doc.resolve(position);
  let currentDepth = Math.min(maxDepth, $position.depth);
  let node: ProseMirrorNode | null = null;

  while (currentDepth > 0 && node === null) {
    const currentNode = $position.node(currentDepth);

    if (currentNode.type === type) {
      node = currentNode;
      break;
    }

    currentDepth -= 1;
  }

  return [node, currentDepth];
}
