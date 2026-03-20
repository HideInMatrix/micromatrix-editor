import {
  Plugin,
  PluginKey,
} from "@mxm-editor/pm";
import { Extension } from "../Extension";
import {
  getTextBetween,
  getTextSerializersFromSchema,
} from "../helpers";

export const ClipboardTextSerializer = Extension.create({
  name: "clipboardTextSerializer",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("clipboardTextSerializer"),
        props: {
          clipboardTextSerializer: () => {
            const { editor } = this;
            const { state, schema } = editor;
            const { doc, selection } = state;
            const { ranges } = selection;
            const from = Math.min(...ranges.map((range) => range.$from.pos));
            const to = Math.max(...ranges.map((range) => range.$to.pos));
            const textSerializers = getTextSerializersFromSchema(schema);

            return getTextBetween(doc, { from, to }, {
              ...(this.editor.options.coreExtensionOptions?.clipboardTextSerializer?.blockSeparator
                !== undefined
                ? {
                  blockSeparator: this.editor.options.coreExtensionOptions
                    .clipboardTextSerializer
                    ?.blockSeparator,
                }
                : {}),
              textSerializers,
            });
          },
        },
      }),
    ];
  },
});
