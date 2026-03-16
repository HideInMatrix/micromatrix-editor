import { getSchema, type Extensions } from "@mxm-editor/core";
import { DOMParser as ProseMirrorDOMParser, type ParseOptions } from "@mxm-editor/pm";

export function generateJSON(
  html: string,
  extensions: Extensions,
  options?: ParseOptions,
) {
  if (typeof window === "undefined") {
    throw new Error(
      "generateJSON can only be used in a browser environment.\nUse the `@mxm-editor/html/server` import in Node.",
    );
  }

  const schema = getSchema(extensions);
  const doc = new window.DOMParser().parseFromString(html, "text/html");

  if (!doc) {
    throw new Error("Failed to parse HTML string.");
  }

  return ProseMirrorDOMParser.fromSchema(schema)
    .parse(doc.body, options)
    .toJSON();
}
