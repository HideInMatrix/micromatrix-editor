import { describe, expect, it } from "vitest";
import { Table, TableCell as TableCellFromTable, TableHeader as TableHeaderFromTable, TableRow as TableRowFromTable } from "@mxm-editor/extension-table";
import { TableCell } from "@mxm-editor/extension-table-cell";
import { TableHeader } from "@mxm-editor/extension-table-header";
import { TableRow } from "@mxm-editor/extension-table-row";

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
});
