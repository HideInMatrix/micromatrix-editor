import { Node, mergeAttributes } from "@mxm-editor/core";

export interface DetailsSummaryOptions {
  HTMLAttributes: Record<string, string>;
}

export const DetailsSummary = Node.create<DetailsSummaryOptions>({
  name: "detailsSummary",

  content: "text*",
  defining: true,
  selectable: false,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: "summary",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "summary",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  renderMarkdown({ children }) {
    return `<summary>${children}</summary>\n`;
  },
});
