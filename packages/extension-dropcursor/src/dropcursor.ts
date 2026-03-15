import { Extension } from "@mxm-editor/core";
import { dropCursor } from "@mxm-editor/pm";

export interface DropcursorOptions {
  color: string;
  width: number;
  class: string | null;
}

export const Dropcursor = Extension.create<DropcursorOptions>({
  name: "dropcursor",

  addOptions() {
    return {
      color: "#68cef8",
      width: 1,
      class: null,
    };
  },

  addProseMirrorPlugins() {
    return [
      dropCursor({
        color: this.options.color,
        width: this.options.width,
        class: this.options.class ?? undefined,
      }),
    ];
  },
});
