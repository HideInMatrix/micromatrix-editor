import { Plugin, PluginKey } from "@mxm-editor/pm";
import { Extension } from "../Extension";

const editablePluginKey = new PluginKey("editable");

export const Editable = Extension.create({
  name: "editable",
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: editablePluginKey,
        props: {
          editable: () => this.editor.isEditable,
        },
      }),
    ];
  },
});
