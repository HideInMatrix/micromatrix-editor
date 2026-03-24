import { Plugin, PluginKey } from "@mxm-editor/pm";
import { Extension } from "../Extension";

const focusEventsPluginKey = new PluginKey("focusEvents");

export const FocusEvents = Extension.create({
  name: "focusEvents",
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: focusEventsPluginKey,
        props: {
          handleDOMEvents: {
            focus: (view, event) => {
              view.dispatch(
                this.editor.state.tr
                  .setMeta("focus", { event: event as FocusEvent })
                  .setMeta("addToHistory", false),
              );

              return false;
            },
            blur: (view, event) => {
              view.dispatch(
                this.editor.state.tr
                  .setMeta("blur", { event: event as FocusEvent })
                  .setMeta("addToHistory", false),
              );

              return false;
            },
          },
        },
      }),
    ];
  },
});
