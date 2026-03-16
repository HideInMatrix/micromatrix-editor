import type { Extensions, JSONContent } from "@mxm-editor/core";
import { renderToHTMLString } from "@mxm-editor/static-renderer/pm/html-string";

function assertNodeRuntime() {
  const runtime = globalThis as {
    process?: {
      versions?: {
        node?: string;
      };
    };
  };
  const isNode = Boolean(runtime.process?.versions?.node);

  if (!isNode) {
    throw new Error(
      "generateHTML can only be used in a Node environment.\nUse the `@mxm-editor/html` import in the browser.",
    );
  }
}

export function generateHTML(doc: JSONContent, extensions: Extensions): string {
  assertNodeRuntime();

  return renderToHTMLString({
    content: doc,
    extensions,
  });
}
