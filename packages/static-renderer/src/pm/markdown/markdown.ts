import type { Extensions, JSONContent } from "@mxm-editor/core";
import type {
  Mark as ProseMirrorMark,
  Node as ProseMirrorNode,
} from "@mxm-editor/pm";
import type { TiptapStaticRendererOptions } from "../../json/renderer";
import {
  renderToHTMLString,
  serializeChildrenToHTMLString,
} from "../html-string/html-string";

export function renderToMarkdown({
  content,
  extensions,
  options,
}: {
  content: ProseMirrorNode | JSONContent;
  extensions: Extensions;
  options?: Partial<TiptapStaticRendererOptions<string, ProseMirrorMark, ProseMirrorNode>>;
}) {
  return renderToHTMLString({
    content,
    extensions,
    options: {
      ...options,
      nodeMapping: {
        bulletList({ children }) {
          return `\n${serializeChildrenToHTMLString(children)}`;
        },
        orderedList({ children }) {
          return `\n${serializeChildrenToHTMLString(children)}`;
        },
        listItem({ node, children, parent }) {
          if (parent?.type.name === "bulletList") {
            return `- ${serializeChildrenToHTMLString(children).trim()}\n`;
          }

          if (parent?.type.name === "orderedList") {
            let number = parent.attrs.start || 1;

            parent.forEach((parentChild, _offset, index) => {
              if (node.eq(parentChild)) {
                number = index + 1;
              }
            });

            return `${number}. ${serializeChildrenToHTMLString(children).trim()}\n`;
          }

          return serializeChildrenToHTMLString(children);
        },
        paragraph({ children }) {
          return `\n${serializeChildrenToHTMLString(children)}\n`;
        },
        heading({ node, children }) {
          const level = node.attrs.level as number;

          return `${new Array(level).fill("#").join("")} ${serializeChildrenToHTMLString(children)}\n`;
        },
        codeBlock({ node, children }) {
          const language =
            typeof node.attrs.language === "string" ? node.attrs.language : "";

          return `\n\`\`\`${language}\n${serializeChildrenToHTMLString(children)}\n\`\`\`\n`;
        },
        blockquote({ children }) {
          return `\n${serializeChildrenToHTMLString(children)
            .trim()
            .split("\n")
            .map((item) => `> ${item}`)
            .join("\n")}`;
        },
        image({ node }) {
          return `![${node.attrs.alt ?? ""}](${node.attrs.src ?? ""})`;
        },
        hardBreak() {
          return "\n";
        },
        horizontalRule() {
          return "\n---\n";
        },
        table({ children, node }) {
          if (!Array.isArray(children)) {
            return `\n${serializeChildrenToHTMLString(children)}\n`;
          }

          const columnCount = node.firstChild?.childCount ?? 0;

          return `\n${serializeChildrenToHTMLString(children[0])}| ${new Array(columnCount).fill("---").join(" | ")} |\n${serializeChildrenToHTMLString(children.slice(1))}\n`;
        },
        tableRow({ children }) {
          if (Array.isArray(children)) {
            return `| ${children.join(" | ")} |\n`;
          }

          return `${serializeChildrenToHTMLString(children)}\n`;
        },
        tableHeader({ children }) {
          return serializeChildrenToHTMLString(children).trim();
        },
        tableCell({ children }) {
          return serializeChildrenToHTMLString(children).trim();
        },
        ...options?.nodeMapping,
      },
      markMapping: {
        bold({ children }) {
          return `**${serializeChildrenToHTMLString(children)}**`;
        },
        italic({ children, node }) {
          const isBoldToo = node.marks.some((mark) => mark.type.name === "bold");

          if (isBoldToo) {
            return `*${serializeChildrenToHTMLString(children)}*`;
          }

          return `_${serializeChildrenToHTMLString(children)}_`;
        },
        code({ children }) {
          return `\`${serializeChildrenToHTMLString(children)}\``;
        },
        strike({ children }) {
          return `~~${serializeChildrenToHTMLString(children)}~~`;
        },
        underline({ children }) {
          return `<u>${serializeChildrenToHTMLString(children)}</u>`;
        },
        subscript({ children }) {
          return `<sub>${serializeChildrenToHTMLString(children)}</sub>`;
        },
        superscript({ children }) {
          return `<sup>${serializeChildrenToHTMLString(children)}</sup>`;
        },
        link({ mark, children }) {
          return `[${serializeChildrenToHTMLString(children)}](${mark.attrs.href})`;
        },
        highlight({ children }) {
          return `==${serializeChildrenToHTMLString(children)}==`;
        },
        ...options?.markMapping,
      },
    },
  });
}
