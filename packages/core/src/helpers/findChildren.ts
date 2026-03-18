import type { Node as ProseMirrorNode } from "@mxm-editor/pm";

export function findChildren(
  node: ProseMirrorNode,
  predicate: (node: ProseMirrorNode) => boolean,
) {
  const nodes: Array<{ node: ProseMirrorNode; pos: number }> = [];

  node.descendants((child, pos) => {
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
