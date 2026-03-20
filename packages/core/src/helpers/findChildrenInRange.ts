import type { Node as ProseMirrorNode } from "@mxm-editor/pm";

export function findChildrenInRange(
  node: ProseMirrorNode,
  range: { from: number; to: number },
  predicate: (node: ProseMirrorNode) => boolean,
) {
  const nodes: Array<{ node: ProseMirrorNode; pos: number }> = [];

  node.nodesBetween(range.from, range.to, (child, pos) => {
    if (predicate(child)) {
      nodes.push({
        node: child,
        pos,
      });
    }

    return true;
  });

  return nodes;
}
