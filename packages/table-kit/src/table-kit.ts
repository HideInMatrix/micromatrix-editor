import { Extension } from "@mxm-editor/core";
import {
  Table,
  type TableOptions,
} from "@mxm-editor/extension-table";

export interface TableKitOptions {
  table: false | Partial<TableOptions>;
}

export const TableKit = Extension.create<TableKitOptions>({
  name: "tableKit",

  addOptions() {
    return {
      table: {},
    };
  },

  addExtensions() {
    const extensions = [];

    if (this.options.table !== false) {
      extensions.push(Table.configure(this.options.table));
    }

    return extensions;
  },
});
