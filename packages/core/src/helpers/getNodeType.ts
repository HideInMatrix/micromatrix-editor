import type { NodeType, Schema } from "@mxm-editor/pm";

export function getNodeType(
  nameOrType: string | NodeType,
  schema: Schema,
) {
  if (typeof nameOrType !== "string") {
    return nameOrType;
  }

  const nodeType = schema.nodes[nameOrType];

  if (!nodeType) {
    throw new Error(
      `There is no node type named "${nameOrType}". Maybe you forgot to add the extension?`,
    );
  }

  return nodeType;
}
