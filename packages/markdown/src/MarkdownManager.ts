import {
  Editor,
  type AnyExtension,
  type JSONContent,
  escapeMarkdown,
} from "@mxm-editor/core";
import { DOMParser as ProseMirrorDOMParser, type Node as ProseMirrorNode } from "@mxm-editor/pm";
import { marked } from "marked";

export interface MarkdownManagerOptions {
  extensions: AnyExtension[];
}

export class MarkdownManager {
  readonly instance = marked;

  private readonly editor: Editor;

  private readonly extensionsByName: Map<string, AnyExtension>;

  constructor(options: MarkdownManagerOptions) {
    const extensions = options.extensions.filter(
      (extension) => extension.name !== "markdown",
    );

    this.editor = new Editor({
      extensions,
    });
    this.extensionsByName = new Map(
      this.editor.extensionManager.extensions.map((extension) => [
        extension.name,
        extension,
      ]),
    );
  }

  parse(markdown: string) {
    if (typeof document === "undefined") {
      throw new Error("Markdown parsing requires a browser-like DOM environment.");
    }

    const html = marked.parse(markdown, { async: false }) as string;
    const container = document.createElement("div");

    container.innerHTML = html;
    container.querySelectorAll("p > img:only-child").forEach((image) => {
      image.parentElement?.replaceWith(image);
    });

    return ProseMirrorDOMParser.fromSchema(this.editor.schema).parse(container);
  }

  serialize(content: JSONContent | ProseMirrorNode) {
    const document =
      "toJSON" in content ? (content.toJSON() as JSONContent) : content;

    return this.serializeNode(document).trim();
  }

  private serializeNode(node: JSONContent, parent?: JSONContent): string {
    if (!node.type) {
      return "";
    }

    if (node.type === "text") {
      const base = escapeMarkdown(node.text ?? "");

      return (node.marks ?? []).reduce((children, mark) => {
        const extension = this.extensionsByName.get(mark.type);

        if (!extension?.config.renderMarkdown) {
          return children;
        }

        return extension.config.renderMarkdown.call(
          extension.createContext(this.editor),
          {
            node: {
              type: mark.type,
              attrs: mark.attrs,
              text: node.text,
            },
            children,
            parent,
          },
        );
      }, base);
    }

    const children = (node.content ?? [])
      .map((child) => this.serializeNode(child, node))
      .join("");

    if (node.type === "doc") {
      return children;
    }

    const extension = this.extensionsByName.get(node.type);

    if (!extension?.config.renderMarkdown) {
      return children;
    }

    return extension.config.renderMarkdown.call(extension.createContext(this.editor), {
      node,
      children,
      parent,
    });
  }
}
