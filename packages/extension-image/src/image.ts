import type { CommandProps } from "@mxm-editor/core";
import { Node, mergeAttributes } from "@mxm-editor/core";

export interface ImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, string>;
}

export interface ImageAttributes {
  src: string;
  alt?: string | null;
  title?: string | null;
}

export const Image = Node.create<ImageOptions>({
  name: "image",

  group: "block",
  draggable: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          const src = node.getAttribute("src");

          if (!src) {
            return false;
          }

          if (!this.options.allowBase64 && src.startsWith("data:")) {
            return false;
          }

          return {
            src,
            alt: node.getAttribute("alt"),
            title: node.getAttribute("title"),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ];
  },

  renderMarkdown({ node }) {
    const src = node.attrs?.src;

    if (!src) {
      return "";
    }

    const alt = node.attrs?.alt ?? "";
    const title = node.attrs?.title
      ? ` "${String(node.attrs.title).replace(/"/g, '\\"')}"`
      : "";

    return `![${alt}](${src}${title})\n\n`;
  },

  addCommands() {
    return {
      setImage:
        (attributes: ImageAttributes) =>
        ({ state, commands }: Pick<CommandProps, "state" | "commands">) => {
          const content = {
            type: this.name,
            attrs: {
              src: attributes.src,
              alt: attributes.alt ?? null,
              title: attributes.title ?? null,
            },
          };
          const { $from } = state.selection;

          if ($from.parent.isTextblock && $from.depth > 0) {
            if ($from.parent.content.size === 0) {
              return commands.insertContentAt(
                {
                  from: $from.before($from.depth),
                  to: $from.after($from.depth),
                },
                content,
              );
            }

            return commands.insertContentAt($from.after($from.depth), content);
          }

          return commands.insertContent(content);
        },
    };
  },
});
