import {
  Plugin,
  PluginKey,
} from "@mxm-editor/pm";
import { Extension } from "../Extension";

const dropPluginKey = new PluginKey("drop");

export const Drop = Extension.create({
  name: "drop",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: dropPluginKey,
        props: {
          handleDrop: (_view, event, slice, moved) => {
            this.editor.emit("drop", {
              editor: this.editor,
              event,
              slice,
              moved,
            });
            this.editor.options.onDrop({
              editor: this.editor,
              event,
              slice,
              moved,
            });

            return false;
          },
        },
      }),
    ];
  },
});
