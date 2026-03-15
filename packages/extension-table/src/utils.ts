import {
  escapeMarkdown,
  type AnyExtension,
  type Editor,
  type JSONContent,
} from "@mxm-editor/core";

const COLWIDTH_PATTERN = /^\d+(,\d+)*$/;

function getExtensionsByName(editor: Editor) {
  return new Map<string, AnyExtension>(
    editor.extensionManager.extensions.map((extension) => [
      extension.name,
      extension,
    ]),
  );
}

function serializeMarkdownNode(
  editor: Editor,
  node: JSONContent,
  parent?: JSONContent,
  extensionsByName = getExtensionsByName(editor),
): string {
  if (!node.type) {
    return "";
  }

  if (node.type === "text") {
    const base = escapeMarkdown(node.text ?? "");

    return (node.marks ?? []).reduce((children, mark) => {
      const extension = extensionsByName.get(mark.type);

      if (!extension?.config.renderMarkdown) {
        return children;
      }

      return extension.config.renderMarkdown.call(
        extension.createContext(editor),
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
    .map((child) => serializeMarkdownNode(editor, child, node, extensionsByName))
    .join("");

  if (node.type === "doc") {
    return children;
  }

  const extension = extensionsByName.get(node.type);

  if (!extension?.config.renderMarkdown) {
    return children;
  }

  return extension.config.renderMarkdown.call(extension.createContext(editor), {
    node,
    children,
    parent,
  });
}

function normalizeTableCellMarkdown(markdown: string) {
  const lines = markdown
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.join("<br>").replace(/\|/g, "\\|");
}

function getColumnSpan(cell: JSONContent) {
  const colspan = Number(cell.attrs?.colspan ?? 1);

  return Number.isFinite(colspan) && colspan > 0 ? colspan : 1;
}

function serializeTableCell(editor: Editor, cell: JSONContent) {
  const content = (cell.content ?? [])
    .map((child) => serializeMarkdownNode(editor, child, cell))
    .join("");

  return normalizeTableCellMarkdown(content);
}

function expandTableRow(editor: Editor, row: JSONContent) {
  const columns: string[] = [];

  (row.content ?? []).forEach((cell) => {
    const value = serializeTableCell(editor, cell);
    const colspan = getColumnSpan(cell);

    columns.push(value);

    for (let index = 1; index < colspan; index += 1) {
      columns.push("");
    }
  });

  return columns;
}

function formatTableRow(columns: string[]) {
  return `| ${columns.join(" | ")} |`;
}

export function parseTableCellAttributes(element: HTMLElement) {
  const widthAttribute = element.getAttribute("data-colwidth");
  const widths =
    widthAttribute && COLWIDTH_PATTERN.test(widthAttribute)
      ? widthAttribute.split(",").map((value) => Number(value))
      : null;
  const colspan = Number(element.getAttribute("colspan") ?? 1);

  return {
    colspan,
    rowspan: Number(element.getAttribute("rowspan") ?? 1),
    colwidth: widths && widths.length === colspan ? widths : null,
  };
}

export function renderTableCellAttributes(attributes: Record<string, any>) {
  return {
    ...(attributes.colspan && attributes.colspan !== 1
      ? { colspan: String(attributes.colspan) }
      : {}),
    ...(attributes.rowspan && attributes.rowspan !== 1
      ? { rowspan: String(attributes.rowspan) }
      : {}),
    ...(Array.isArray(attributes.colwidth) && attributes.colwidth.length
      ? { "data-colwidth": attributes.colwidth.join(",") }
      : {}),
  };
}

export function renderTableMarkdown(editor: Editor, node: JSONContent) {
  const rows = (node.content ?? []).map((row) => expandTableRow(editor, row));

  if (!rows.length) {
    return "\n";
  }

  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) => [
    ...row,
    ...Array.from({ length: Math.max(columnCount - row.length, 0) }, () => ""),
  ]);
  const headerRow = normalizedRows[0] ?? Array.from({ length: columnCount }, () => "");
  const separatorRow = Array.from({ length: columnCount }, () => "---");
  const bodyRows = normalizedRows.slice(1);

  return [
    formatTableRow(headerRow),
    formatTableRow(separatorRow),
    ...bodyRows.map((row) => formatTableRow(row)),
    "",
    "",
  ].join("\n");
}
