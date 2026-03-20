import type { Node as ProseMirrorNode } from "@mxm-editor/pm";

export function isNodeEmpty(
  node: ProseMirrorNode,
  options: {
    checkChildren?: boolean;
    ignoreWhitespace?: boolean;
  } = {},
): boolean {
  const {
    checkChildren = true,
    ignoreWhitespace = false,
  } = options;

  if (ignoreWhitespace) {
    if (node.type.name === "hardBreak") {
      return true;
    }

    if (node.isText) {
      return !/\S/.test(node.text ?? "");
    }
  }

  if (node.isText) {
    return !node.text;
  }

  if (node.isAtom || node.isLeaf) {
    return false;
  }

  if (node.content.childCount === 0) {
    return true;
  }

  if (!checkChildren) {
    return false;
  }

  let isContentEmpty = true;

  node.content.forEach((childNode) => {
    if (!isContentEmpty) {
      return;
    }

    if (!isNodeEmpty(childNode, { ignoreWhitespace, checkChildren })) {
      isContentEmpty = false;
    }
  });

  return isContentEmpty;
}
