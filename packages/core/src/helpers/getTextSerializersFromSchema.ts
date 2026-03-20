import type { Schema } from "@mxm-editor/pm";
import type { TextSerializer } from "../types";

export function getTextSerializersFromSchema(
  schema: Schema,
): Record<string, TextSerializer> {
  return Object.fromEntries(
    Object.entries(schema.nodes)
      .filter(([, node]) =>
        Boolean((node.spec as typeof node.spec & { toText?: TextSerializer }).toText),
      )
      .map(([name, node]) => [
        name,
        (node.spec as typeof node.spec & { toText: TextSerializer }).toText,
      ]),
  );
}
