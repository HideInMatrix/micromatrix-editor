import {
  Plugin,
  PluginKey,
} from "@mxm-editor/pm";
import { Extension } from "../Extension";

const pastePluginKey = new PluginKey("paste");

export const Paste = Extension.create({
  name: "paste",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pastePluginKey,
        props: {
          handlePaste: (_view, event, slice) => {
            this.editor.emit("paste", {
              editor: this.editor,
              event,
              slice,
            });

            return false;
          },
        },
      }),
    ];
  },
});
