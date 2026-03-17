import { Mark, mergeAttributes } from "@mxm-editor/core";

function parseThreadIds(rawValue: string | null) {
  if (!rawValue) {
    return [];
  }

  return Array.from(
    new Set(
      rawValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export const InlineThread = Mark.create({
  name: "inlineThread",

  inclusive: false,

  addAttributes() {
    return {
      threadIds: {
        default: [],
        parseHTML: (element: HTMLElement) =>
          parseThreadIds(
            element.getAttribute("data-thread-ids")
            ?? element.getAttribute("data-thread-id"),
          ),
        renderHTML: (attributes: Record<string, any>) => {
          const threadIds = Array.isArray(attributes.threadIds)
            ? attributes.threadIds.filter((item: unknown) => typeof item === "string")
            : [];

          if (!threadIds.length) {
            return {} as Record<string, string>;
          }

          return {
            "data-thread-ids": threadIds.join(","),
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-thread-ids]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  renderMarkdown({ children }) {
    return children;
  },
});
