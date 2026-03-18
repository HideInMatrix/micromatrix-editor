import type {
  Node as ProseMirrorNode,
  ResolvedPos,
  Selection,
} from "@mxm-editor/pm";

export interface NodeWithPosition {
  pos: number;
  start: number;
  depth: number;
  node: ProseMirrorNode;
}

export function findParentNodeClosestToPos(
  $pos: ResolvedPos,
  predicate: (node: ProseMirrorNode) => boolean,
): NodeWithPosition | undefined {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);

    if (!predicate(node)) {
      continue;
    }

    return {
      pos: $pos.before(depth),
      start: $pos.start(depth),
      depth,
      node,
    };
  }

  return undefined;
}

export function findParentNode(
  predicate: (node: ProseMirrorNode) => boolean,
) {
  return (selection: Selection) =>
    findParentNodeClosestToPos(selection.$from, predicate);
}
