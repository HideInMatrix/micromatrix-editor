import { Extension, type AnyExtension } from "@mxm-editor/core";
import { MarkdownManager } from "./MarkdownManager";

export interface MarkdownOptions {}

export interface MarkdownStorage {
  manager: MarkdownManager | null;
}

function createMarkdownManager(extensions: AnyExtension[]) {
  return new MarkdownManager({
    extensions: extensions.filter((extension) => extension.name !== "markdown"),
  });
}

export const Markdown = Extension.create<MarkdownOptions, MarkdownStorage>({
  name: "markdown",

  addOptions() {
    return {};
  },

  addStorage() {
    return {
      manager: null,
    };
  },

  onExtensionsResolved() {
    const manager = createMarkdownManager(this.editor.options.extensions);

    this.storage.manager = manager;
    this.editor.markdown = manager;
  },

  onCreate() {
    if (!this.storage.manager) {
      this.storage.manager = createMarkdownManager(
        this.editor.options.extensions,
      );
    }

    this.editor.markdown = this.storage.manager;
  },

  onDestroy() {
    if (this.editor.markdown === this.storage.manager) {
      this.editor.markdown = null;
    }
  },
});
