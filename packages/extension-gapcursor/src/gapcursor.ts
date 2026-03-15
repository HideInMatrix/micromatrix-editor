import { Extension } from "@mxm-editor/core";
import { gapCursor } from "@mxm-editor/pm";

export const Gapcursor = Extension.create({
  name: "gapcursor",

  addProseMirrorPlugins() {
    return [gapCursor()];
  },
});
