import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

const fromRoot = (path: string) => new URL(path, import.meta.url).pathname;
const editorCorePackages = [
  "/packages/pm/",
  "/packages/core/",
  "/packages/react/",
  "/packages/starter-kit/",
  "/packages/extension-document/",
  "/packages/extension-paragraph/",
  "/packages/extension-text/",
  "/packages/extension-bold/",
  "/packages/extension-character-count/",
  "/packages/extension-color/",
  "/packages/extension-code/",
  "/packages/extension-italic/",
  "/packages/extension-highlight/",
  "/packages/extension-image/",
  "/packages/extension-link/",
  "/packages/extension-list-keymap/",
  "/packages/extension-strike/",
  "/packages/extension-text-style/",
  "/packages/extension-underline/",
  "/packages/extension-hard-break/",
  "/packages/extension-horizontal-rule/",
  "/packages/extension-placeholder/",
  "/packages/extension-history/",
  "/packages/extension-text-align/",
  "/packages/extension-undo-redo/",
  "/packages/extension-dropcursor/",
  "/packages/extension-gapcursor/",
  "/packages/extension-heading/",
  "/packages/extension-list-item/",
  "/packages/extension-blockquote/",
  "/packages/extension-bullet-list/",
  "/packages/extension-ordered-list/",
  "/packages/extension-task-list/",
  "/packages/extension-task-item/",
  "/packages/extension-code-block/",
  "/packages/extension-table/",
];
const editorFeaturePackages = [
  "/packages/extension-callout/",
  "/packages/extension-mention/",
  "/packages/suggestion/",
  "/packages/markdown/",
];

function includesAny(id: string, patterns: string[]) {
  return patterns.some((pattern) => id.includes(pattern));
}

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("/node_modules/react/")
            || id.includes("/node_modules/react-dom/")
            || id.includes("/node_modules/scheduler/")
          ) {
            return "react-vendor";
          }

          if (
            id.includes("/node_modules/yjs/")
            || id.includes("/node_modules/y-prosemirror/")
            || id.includes("/node_modules/y-protocols/")
            || id.includes("/node_modules/lib0/")
          ) {
            return "collab-vendor";
          }

          if (
            id.includes("/node_modules/prosemirror-")
            || id.includes("/node_modules/orderedmap/")
            || id.includes("/node_modules/rope-sequence/")
            || id.includes("/node_modules/w3c-keyname/")
          ) {
            return "prosemirror-vendor";
          }

          if (id.includes("/node_modules/marked/")) {
            return "markdown-vendor";
          }

          if (
            id.includes("/packages/extension-collaboration/")
            || id.includes("/packages/extension-collaboration-caret/")
          ) {
            return "editor-collaboration";
          }

          if (includesAny(id, editorFeaturePackages)) {
            return "editor-features";
          }

          if (includesAny(id, editorCorePackages)) {
            return "editor-core";
          }

          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@mxm-editor/pm": fromRoot("../../packages/pm/src/index.ts"),
      "@mxm-editor/core": fromRoot("../../packages/core/src/index.ts"),
      "@mxm-editor/extension-blockquote": fromRoot(
        "../../packages/extension-blockquote/src/index.ts",
      ),
      "@mxm-editor/extension-bullet-list": fromRoot(
        "../../packages/extension-bullet-list/src/index.ts",
      ),
      "@mxm-editor/extension-code": fromRoot(
        "../../packages/extension-code/src/index.ts",
      ),
      "@mxm-editor/extension-code-block": fromRoot(
        "../../packages/extension-code-block/src/index.ts",
      ),
      "@mxm-editor/extension-character-count": fromRoot(
        "../../packages/extension-character-count/src/index.ts",
      ),
      "@mxm-editor/extension-collaboration-caret": fromRoot(
        "../../packages/extension-collaboration-caret/src/index.ts",
      ),
      "@mxm-editor/extension-color": fromRoot(
        "../../packages/extension-color/src/index.ts",
      ),
      "@mxm-editor/extension-document": fromRoot(
        "../../packages/extension-document/src/index.ts",
      ),
      "@mxm-editor/extension-dropcursor": fromRoot(
        "../../packages/extension-dropcursor/src/index.ts",
      ),
      "@mxm-editor/extension-gapcursor": fromRoot(
        "../../packages/extension-gapcursor/src/index.ts",
      ),
      "@mxm-editor/extension-heading": fromRoot(
        "../../packages/extension-heading/src/index.ts",
      ),
      "@mxm-editor/extension-hard-break": fromRoot(
        "../../packages/extension-hard-break/src/index.ts",
      ),
      "@mxm-editor/extension-horizontal-rule": fromRoot(
        "../../packages/extension-horizontal-rule/src/index.ts",
      ),
      "@mxm-editor/extension-highlight": fromRoot(
        "../../packages/extension-highlight/src/index.ts",
      ),
      "@mxm-editor/extension-image": fromRoot(
        "../../packages/extension-image/src/index.ts",
      ),
      "@mxm-editor/extension-list-item": fromRoot(
        "../../packages/extension-list-item/src/index.ts",
      ),
      "@mxm-editor/extension-list-keymap": fromRoot(
        "../../packages/extension-list-keymap/src/index.ts",
      ),
      "@mxm-editor/extension-paragraph": fromRoot(
        "../../packages/extension-paragraph/src/index.ts",
      ),
      "@mxm-editor/extension-placeholder": fromRoot(
        "../../packages/extension-placeholder/src/index.ts",
      ),
      "@mxm-editor/extension-table": fromRoot(
        "../../packages/extension-table/src/index.ts",
      ),
      "@mxm-editor/extension-text-style": fromRoot(
        "../../packages/extension-text-style/src/index.ts",
      ),
      "@mxm-editor/extension-text-align": fromRoot(
        "../../packages/extension-text-align/src/index.ts",
      ),
      "@mxm-editor/extension-ordered-list": fromRoot(
        "../../packages/extension-ordered-list/src/index.ts",
      ),
      "@mxm-editor/extension-text": fromRoot(
        "../../packages/extension-text/src/index.ts",
      ),
      "@mxm-editor/extension-bold": fromRoot(
        "../../packages/extension-bold/src/index.ts",
      ),
      "@mxm-editor/extension-italic": fromRoot(
        "../../packages/extension-italic/src/index.ts",
      ),
      "@mxm-editor/extension-link": fromRoot(
        "../../packages/extension-link/src/index.ts",
      ),
      "@mxm-editor/extension-strike": fromRoot(
        "../../packages/extension-strike/src/index.ts",
      ),
      "@mxm-editor/extension-history": fromRoot(
        "../../packages/extension-history/src/index.ts",
      ),
      "@mxm-editor/extension-underline": fromRoot(
        "../../packages/extension-underline/src/index.ts",
      ),
      "@mxm-editor/extension-undo-redo": fromRoot(
        "../../packages/extension-undo-redo/src/index.ts",
      ),
      "@mxm-editor/extension-collaboration": fromRoot(
        "../../packages/extension-collaboration/src/index.ts",
      ),
      "@mxm-editor/extension-mention": fromRoot(
        "../../packages/extension-mention/src/index.ts",
      ),
      "@mxm-editor/extension-callout": fromRoot(
        "../../packages/extension-callout/src/index.ts",
      ),
      "@mxm-editor/extension-task-item": fromRoot(
        "../../packages/extension-task-item/src/index.ts",
      ),
      "@mxm-editor/extension-task-list": fromRoot(
        "../../packages/extension-task-list/src/index.ts",
      ),
      "@mxm-editor/starter-kit": fromRoot(
        "../../packages/starter-kit/src/index.ts",
      ),
      "@mxm-editor/react": fromRoot("../../packages/react/src/index.ts"),
      "@mxm-editor/react/menus": fromRoot("../../packages/react/src/menus.ts"),
      "@mxm-editor/markdown": fromRoot("../../packages/markdown/src/index.ts"),
      "@mxm-editor/suggestion": fromRoot(
        "../../packages/suggestion/src/index.ts",
      ),
    },
  },
});
