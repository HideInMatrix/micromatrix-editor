import { NodeSelection, TextSelection } from "@tiptap/pm/state";

export const getSelectionNode = (editor) => {
  const { selection } = editor.state;
  if (selection instanceof NodeSelection && selection.node) {
    return selection.node;
  }
  const { $from } = selection;
  if ($from.depth >= 1) {
    return $from.node(1);
  }
  return selection.node;
};

export const getSelectionText = (editor) => {
  const { from, to, empty } = editor.state.selection;
  if (empty) {
    return "";
  }
  return editor.state.doc.textBetween(from, to, "");
};

const truncateSelectionSummary = (value = "", maxLength = 160) => {
  const normalized = `${value}`.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (/^data:/i.test(normalized)) {
    return "data-url";
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
};

const getNodeSummaryValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  if (typeof value === "string") {
    return truncateSelectionSummary(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return `${value}`;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const summary = getNodeSummaryValue(item);
      if (summary) {
        return summary;
      }
    }
    return "";
  }
  if (typeof value === "object") {
    const priorityKeys = [
      "text",
      "title",
      "name",
      "caption",
      "alt",
      "content",
      "label",
      "description",
      "url",
      "src",
      "latex",
      "value",
    ];
    for (const key of priorityKeys) {
      const summary = getNodeSummaryValue(value[key]);
      if (summary) {
        return summary;
      }
    }
    return "";
  }
  return "";
};

const getSelectedNodeSummary = (editor) => {
  const selection = editor?.state?.selection;
  const node =
    selection instanceof NodeSelection && selection.node
      ? selection.node
      : selection?.node;

  if (!node) {
    return "";
  }

  const nodeType = truncateSelectionSummary(node.type?.name || "node", 48);
  const textContent = truncateSelectionSummary(node.textContent || "");
  if (textContent) {
    return `${nodeType}: ${textContent}`;
  }

  const attrs = node.attrs || {};
  const detail =
    getNodeSummaryValue(attrs.title) ||
    getNodeSummaryValue(attrs.name) ||
    getNodeSummaryValue(attrs.caption) ||
    getNodeSummaryValue(attrs.alt) ||
    getNodeSummaryValue(attrs.content) ||
    getNodeSummaryValue(attrs.value) ||
    getNodeSummaryValue(attrs.url) ||
    getNodeSummaryValue(attrs.src) ||
    getNodeSummaryValue(attrs.chartOptions) ||
    getNodeSummaryValue(attrs.chartConfig) ||
    getNodeSummaryValue(attrs.math) ||
    getNodeSummaryValue(attrs.mermaid) ||
    getNodeSummaryValue(attrs.diagram);

  return detail ? `${nodeType}: ${detail}` : nodeType;
};

export const getSelectionTextForAi = (editor) => {
  const text = truncateSelectionSummary(getSelectionText(editor));
  if (text) {
    return text;
  }
  return getSelectedNodeSummary(editor);
};

export const hasAiSelection = (editor) => {
  const selection = editor?.state?.selection;
  if (!selection) {
    return false;
  }
  if (selection instanceof NodeSelection && selection.node) {
    return true;
  }
  if (selection.empty) {
    return false;
  }
  return !!getSelectionTextForAi(editor);
};

export const getAiSelectionAnchor = (editor) => {
  const selection = editor?.state?.selection;
  if (!selection) {
    return null;
  }

  const node =
    selection instanceof NodeSelection && selection.node
      ? selection.node
      : selection?.node;
  const { from, to, empty } = selection;

  if (node) {
    return {
      from,
      to,
      empty: false,
      isNodeSelection: true,
      nodeType: node.type?.name || "",
      nodeSize: node.nodeSize || 0,
    };
  }

  if (empty) {
    return null;
  }

  return {
    from,
    to,
    empty: false,
    isNodeSelection: false,
    nodeType: "",
    nodeSize: Math.max(to - from, 0),
  };
};

export const setSelectionText = (editor, prevDocLength, from, to) => {
  const state = editor?.state;
  // 计算新的文档长度
  const newDocLength = state.doc.content.size;
  // 计算插入内容后的实际结束位置
  const newTo = to + (newDocLength - prevDocLength);
  if (newTo <= from) {
    return false;
  }
  const selection = TextSelection.create(state.doc, from, newTo);
  const { tr } = editor.view.state;
  if (tr && selection) {
    tr.setSelection(selection);
    editor.view.dispatch(tr);
    editor?.commands.focus();
  }
};
