import { Plugin, PluginKey } from "@mxm-editor/pm";
import { Extension } from "../Extension";

const tabindexPluginKey = new PluginKey("tabindex");

export const Tabindex = Extension.create({
  name: "tabindex",
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: tabindexPluginKey,
        props: {
          attributes: () => {
            if (!this.editor.isEditable) {
              return {} as Record<string, string>;
            }

            return {
              tabindex: "0",
            };
          },
        },
      }),
    ];
  },
});
