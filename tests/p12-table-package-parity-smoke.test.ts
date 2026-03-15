import { describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import { Table, TableCell as TableCellFromTable, TableHeader as TableHeaderFromTable, TableRow as TableRowFromTable } from "@mxm-editor/extension-table";
import { TableCell } from "@mxm-editor/extension-table-cell";
import { TableHeader } from "@mxm-editor/extension-table-header";
import { TableRow } from "@mxm-editor/extension-table-row";
import { StarterKit } from "@mxm-editor/starter-kit";
import { TableKit } from "@mxm-editor/table-kit";

describe("P12 table package parity smoke", () => {
  it("exposes standalone table node packages with tiptap-aligned names", () => {
    expect(Table.name).toBe("table");
    expect(TableCell.name).toBe("tableCell");
    expect(TableHeader.name).toBe("tableHeader");
    expect(TableRow.name).toBe("tableRow");
  });

  it("keeps extension-table root exports aligned with standalone node packages", () => {
    expect(TableCellFromTable.name).toBe(TableCell.name);
    expect(TableHeaderFromTable.name).toBe(TableHeader.name);
    expect(TableRowFromTable.name).toBe(TableRow.name);
  });

  it("keeps the column resizing table view active so colwidth updates affect DOM widths", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          trailingNode: false,
        }),
        TableKit,
      ],
      content: "<p></p>",
    });

    expect(
      editor.commands.insertTable({
        rows: 2,
        cols: 2,
        withHeaderRow: true,
      }),
    ).toBe(true);

    const table = element.querySelector("table");
    const colgroup = table?.querySelector("colgroup");

    expect(table).not.toBeNull();
    expect(colgroup).not.toBeNull();

    let firstCellPos = -1;

    editor.state.doc.descendants((node, pos) => {
      if ((node.type.name === "tableHeader" || node.type.name === "tableCell") && firstCellPos < 0) {
        firstCellPos = pos;
        return false;
      }

      return true;
    });

    expect(firstCellPos).toBeGreaterThan(-1);

    const firstCell = editor.state.doc.nodeAt(firstCellPos);

    expect(firstCell).not.toBeNull();

    editor.view?.dispatch(
      editor.state.tr.setNodeMarkup(firstCellPos, undefined, {
        ...firstCell?.attrs,
        colwidth: [240],
      }),
    );

    const cols = Array.from(element.querySelectorAll("col"));

    expect(cols[0]?.getAttribute("style") ?? "").toContain("240px");
    expect(table?.getAttribute("style") ?? "").toContain("min-width");
  });
});
