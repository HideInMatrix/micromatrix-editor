import { JSDOM } from "jsdom";
import { getSchema, type Extensions } from "@mxm-editor/core";
import { DOMParser as ProseMirrorDOMParser, type ParseOptions } from "@mxm-editor/pm";

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
      "generateJSON can only be used in a Node environment.\nUse the `@mxm-editor/html` import in the browser.",
    );
  }
}

export function generateJSON(
  html: string,
  extensions: Extensions,
  options?: ParseOptions,
) {
  assertNodeRuntime();

  const schema = getSchema(extensions);
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);

  try {
    const { document } = dom.window;

    return ProseMirrorDOMParser.fromSchema(schema)
      .parse(document.body, options)
      .toJSON();
  } finally {
    dom.window.close();
  }
}
