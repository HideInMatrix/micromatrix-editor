import type { Extensions, JSONContent } from "@mxm-editor/core";
import { renderToHTMLString } from "@mxm-editor/static-renderer/pm/html-string";

export function generateHTML(doc: JSONContent, extensions: Extensions): string {
  if (typeof window === "undefined") {
    throw new Error(
      "generateHTML can only be used in a browser environment.\nUse the `@mxm-editor/html/server` import in Node.",
    );
  }

  return renderToHTMLString({
    content: doc,
    extensions,
  });
}
