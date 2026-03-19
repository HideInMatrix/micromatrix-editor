import type { NodeType } from "@mxm-editor/pm";

export function isList(nodeType: NodeType | null | undefined) {
  if (!nodeType) {
    return false;
  }

  const groups = nodeType.spec.group?.split(" ") ?? [];

  if (groups.includes("list")) {
    return true;
  }

  const content = typeof nodeType.spec.content === "string"
    ? nodeType.spec.content
    : "";

  return /(listItem|taskItem)\+/.test(content);
}
