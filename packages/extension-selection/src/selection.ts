import { Extension } from "@mxm-editor/core";
import {
  Decoration,
  DecorationSet,
  NodeSelection,
  Plugin,
  PluginKey,
} from "@mxm-editor/pm";

export interface SelectionOptions {
  className: string;
}

interface SelectionPluginState {
  focused: boolean;
}

const selectionPluginKey = new PluginKey<SelectionPluginState>("selection");

export const Selection = Extension.create<SelectionOptions>({
  name: "selection",

  addOptions() {
    return {
      className: "selection",
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SelectionPluginState>({
        key: selectionPluginKey,
        state: {
          init: () => ({
            focused: false,
          }),
          apply: (transaction, value) => {
            const meta = transaction.getMeta(selectionPluginKey) as
              | SelectionPluginState
              | undefined;

            return meta ?? value;
          },
        },
        props: {
          decorations: (state) => {
            const pluginState = selectionPluginKey.getState(state);

            if (pluginState?.focused ?? false) {
              return null;
            }

            if (state.selection.empty) {
              return null;
            }

            if (state.selection instanceof NodeSelection) {
              return DecorationSet.create(state.doc, [
                Decoration.node(
                  state.selection.from,
                  state.selection.to,
                  { class: this.options.className },
                ),
              ]);
            }

            return DecorationSet.create(state.doc, [
              Decoration.inline(
                state.selection.from,
                state.selection.to,
                { class: this.options.className },
              ),
            ]);
          },
          handleDOMEvents: {
            blur: (view) => {
              const pluginState = selectionPluginKey.getState(view.state);

              if (pluginState?.focused === false) {
                return false;
              }

              view.dispatch(
                view.state.tr.setMeta(selectionPluginKey, {
                  focused: false,
                } satisfies SelectionPluginState),
              );

              return false;
            },
            focus: (view) => {
              const pluginState = selectionPluginKey.getState(view.state);

              if (pluginState?.focused === true) {
                return false;
              }

              view.dispatch(
                view.state.tr.setMeta(selectionPluginKey, {
                  focused: true,
                } satisfies SelectionPluginState),
              );

              return false;
            },
          },
        },
      }),
    ];
  },
});
