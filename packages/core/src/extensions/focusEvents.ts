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
            focus: (_view, event) => {
              this.editor.emit("focus", {
                editor: this.editor,
                event: event as FocusEvent,
              });
              this.editor.options.onFocus({
                editor: this.editor,
                event: event as FocusEvent,
              });

              return false;
            },
            blur: (_view, event) => {
              this.editor.emit("blur", {
                editor: this.editor,
                event: event as FocusEvent,
              });
              this.editor.options.onBlur({
                editor: this.editor,
                event: event as FocusEvent,
              });

              return false;
            },
          },
        },
      }),
    ];
  },
});
