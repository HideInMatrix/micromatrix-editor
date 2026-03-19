import type { MarkType, Schema } from "@mxm-editor/pm";

export function getMarkType(
  nameOrType: string | MarkType,
  schema: Schema,
) {
  if (typeof nameOrType !== "string") {
    return nameOrType;
  }

  const markType = schema.marks[nameOrType];

  if (!markType) {
    throw new Error(
      `There is no mark type named "${nameOrType}". Maybe you forgot to add the extension?`,
    );
  }

  return markType;
}
