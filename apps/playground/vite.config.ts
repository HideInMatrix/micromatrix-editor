import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

const fromRoot = (path: string) => new URL(path, import.meta.url).pathname;
const editorCorePackages = [
  "/packages/pm/",
  "/packages/core/",
  "/packages/react/",
  "/packages/starter-kit/",
  "/packages/extension-audio/",
  "/packages/extension-code-block-lowlight/",
  "/packages/extension-document/",
  "/packages/extension-paragraph/",
  "/packages/extension-text/",
  "/packages/extension-bold/",
  "/packages/extension-background-color/",
  "/packages/extension-bubble-menu/",
  "/packages/extension-character-count/",
  "/packages/extension-color/",
  "/packages/extension-details/",
  "/packages/extension-details-content/",
  "/packages/extension-details-summary/",
  "/packages/extension-code/",
  "/packages/extension-italic/",
  "/packages/extension-font-family/",
  "/packages/extension-font-size/",
  "/packages/extension-highlight/",
  "/packages/extension-image/",
  "/packages/extension-invisible-characters/",
  "/packages/extension-line-height/",
  "/packages/extension-link/",
  "/packages/extension-list-keymap/",
  "/packages/extension-selection/",
  "/packages/extension-strike/",
  "/packages/extension-subscript/",
  "/packages/extension-superscript/",
  "/packages/extension-text-style/",
  "/packages/extension-underline/",
  "/packages/extension-hard-break/",
  "/packages/extension-horizontal-rule/",
  "/packages/extension-placeholder/",
  "/packages/extension-trailing-node/",
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
  "/packages/extension-table-cell/",
  "/packages/extension-table-header/",
  "/packages/extension-table-row/",
  "/packages/extension-table-of-contents/",
  "/packages/extension-typography/",
  "/packages/extension-twitch/",
  "/packages/extension-youtube/",
  "/packages/list-kit/",
  "/packages/table-kit/",
  "/packages/text-style-kit/",
];
const editorFeaturePackages = [
  "/packages/extension-callout/",
  "/packages/extension-drag-handle/",
  "/packages/extension-emoji/",
  "/packages/extension-focus/",
  "/packages/extension-file-handler/",
  "/packages/extension-floating-menu/",
  "/packages/extension-mention/",
  "/packages/extension-unique-id/",
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
      "@mxm-editor/extension-audio": fromRoot(
        "../../packages/extension-audio/src/index.ts",
      ),
      "@mxm-editor/extension-blockquote": fromRoot(
        "../../packages/extension-blockquote/src/index.ts",
      ),
      "@mxm-editor/extension-background-color": fromRoot(
        "../../packages/extension-background-color/src/index.ts",
      ),
      "@mxm-editor/extension-bubble-menu": fromRoot(
        "../../packages/extension-bubble-menu/src/index.ts",
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
      "@mxm-editor/extension-code-block-lowlight": fromRoot(
        "../../packages/extension-code-block-lowlight/src/index.ts",
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
      "@mxm-editor/extension-details": fromRoot(
        "../../packages/extension-details/src/index.ts",
      ),
      "@mxm-editor/extension-details-content": fromRoot(
        "../../packages/extension-details-content/src/index.ts",
      ),
      "@mxm-editor/extension-details-summary": fromRoot(
        "../../packages/extension-details-summary/src/index.ts",
      ),
      "@mxm-editor/extension-document": fromRoot(
        "../../packages/extension-document/src/index.ts",
      ),
      "@mxm-editor/extension-dropcursor": fromRoot(
        "../../packages/extension-dropcursor/src/index.ts",
      ),
      "@mxm-editor/extension-drag-handle": fromRoot(
        "../../packages/extension-drag-handle/src/index.ts",
      ),
      "@mxm-editor/extension-emoji": fromRoot(
        "../../packages/extension-emoji/src/index.ts",
      ),
      "@mxm-editor/extension-file-handler": fromRoot(
        "../../packages/extension-file-handler/src/index.ts",
      ),
      "@mxm-editor/extension-focus": fromRoot(
        "../../packages/extension-focus/src/index.ts",
      ),
      "@mxm-editor/extension-floating-menu": fromRoot(
        "../../packages/extension-floating-menu/src/index.ts",
      ),
      "@mxm-editor/extension-font-family": fromRoot(
        "../../packages/extension-font-family/src/index.ts",
      ),
      "@mxm-editor/extension-font-size": fromRoot(
        "../../packages/extension-font-size/src/index.ts",
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
      "@mxm-editor/extension-invisible-characters": fromRoot(
        "../../packages/extension-invisible-characters/src/index.ts",
      ),
      "@mxm-editor/extension-line-height": fromRoot(
        "../../packages/extension-line-height/src/index.ts",
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
      "@mxm-editor/extension-selection": fromRoot(
        "../../packages/extension-selection/src/index.ts",
      ),
      "@mxm-editor/extension-table": fromRoot(
        "../../packages/extension-table/src/index.ts",
      ),
      "@mxm-editor/extension-table-cell": fromRoot(
        "../../packages/extension-table-cell/src/index.ts",
      ),
      "@mxm-editor/extension-table-header": fromRoot(
        "../../packages/extension-table-header/src/index.ts",
      ),
      "@mxm-editor/extension-table-row": fromRoot(
        "../../packages/extension-table-row/src/index.ts",
      ),
      "@mxm-editor/extension-table-of-contents": fromRoot(
        "../../packages/extension-table-of-contents/src/index.ts",
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
      "@mxm-editor/extension-subscript": fromRoot(
        "../../packages/extension-subscript/src/index.ts",
      ),
      "@mxm-editor/extension-superscript": fromRoot(
        "../../packages/extension-superscript/src/index.ts",
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
      "@mxm-editor/extension-trailing-node": fromRoot(
        "../../packages/extension-trailing-node/src/index.ts",
      ),
      "@mxm-editor/extension-typography": fromRoot(
        "../../packages/extension-typography/src/index.ts",
      ),
      "@mxm-editor/extension-unique-id": fromRoot(
        "../../packages/extension-unique-id/src/index.ts",
      ),
      "@mxm-editor/extension-twitch": fromRoot(
        "../../packages/extension-twitch/src/index.ts",
      ),
      "@mxm-editor/extension-youtube": fromRoot(
        "../../packages/extension-youtube/src/index.ts",
      ),
      "@mxm-editor/list-kit": fromRoot(
        "../../packages/list-kit/src/index.ts",
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
      "@mxm-editor/table-kit": fromRoot(
        "../../packages/table-kit/src/index.ts",
      ),
      "@mxm-editor/text-style-kit": fromRoot(
        "../../packages/text-style-kit/src/index.ts",
      ),
    },
  },
});
