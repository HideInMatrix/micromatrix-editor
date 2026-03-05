import type { DragHandleRule, NestedOptions } from "@tiptap/extension-drag-handle";

const excludedInnerNodeNames = new Set([
  "tableRow",
  "tableCell",
  "tableHeader",
  "listItem",
  "taskItem",
]);

const excludeTableAndListContextRule: DragHandleRule = {
  id: "exclude-table-and-list-inner-context",
  evaluate: ({ node, $pos, depth }) => {
    if (excludedInnerNodeNames.has(node.type.name)) {
      return 1000;
    }

    for (let ancestorDepth = depth - 1; ancestorDepth >= 0; ancestorDepth -= 1) {
      if (excludedInnerNodeNames.has($pos.node(ancestorDepth).type.name)) {
        return 1000;
      }
    }

    return 0;
  },
};

const excludeInlineContentRule: DragHandleRule = {
  id: "exclude-inline-content",
  evaluate: ({ node }) => {
    if (node.isInline || node.isText) {
      return 1000;
    }

    return 0;
  },
};

const dragHandleNestedOptions: NestedOptions = {
  defaultRules: false,
  rules: [excludeInlineContentRule, excludeTableAndListContextRule],
};

const handleDragHandleStart = (event: DragEvent) => {
  queueMicrotask(() => {
    if (!event.dataTransfer) {
      return;
    }

    if (!event.dataTransfer.types.includes("text/plain")) {
      event.dataTransfer.setData("text/plain", " ");
    }

    event.dataTransfer.effectAllowed = "copyMove";
  });
};

export const useWritingStudioDragHandle = () => {
  return {
    dragHandleNestedOptions,
    handleDragHandleStart,
  };
};
