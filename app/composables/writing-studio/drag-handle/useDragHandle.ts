import type { DragHandleRule, NestedOptions } from "@tiptap/extension-drag-handle";

// 这些节点内部不显示段落拖拽手柄
const excludedInnerNodeNames = new Set([
  "tableRow",
  "tableCell",
  "tableHeader",
  "listItem",
  "taskItem",
]);

// 在表格/列表上下文内禁用拖拽手柄
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

// 对行内内容禁用拖拽手柄
const excludeInlineContentRule: DragHandleRule = {
  id: "exclude-inline-content",
  evaluate: ({ node }) => {
    if (node.isInline || node.isText) {
      return 1000;
    }

    return 0;
  },
};

// 使用自定义规则覆盖默认规则
const dragHandleNestedOptions: NestedOptions = {
  defaultRules: false,
  rules: [excludeInlineContentRule, excludeTableAndListContextRule],
};

// 初始化拖拽数据，避免部分浏览器拖拽异常
const handleDragHandleStart = (event: DragEvent) => {
  console.log("拖动了");
  
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

// 导出拖拽手柄能力
export const useWritingStudioDragHandle = () => {
  return {
    dragHandleNestedOptions,
    handleDragHandleStart,
  };
};
