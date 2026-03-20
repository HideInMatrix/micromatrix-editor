import {
  Plugin,
  PluginKey,
} from "@mxm-editor/pm";
import { Extension } from "../Extension";

export const TextDirection = Extension.create({
  name: "textDirection",

  addGlobalAttributes() {
    const direction = this.editor.options.coreExtensionOptions?.textDirection?.direction;

    if (!direction) {
      return [];
    }

    const nodeExtensions = (this.extensions ?? []).filter(
      (extension) => extension.type === "node",
    );

    return [
      {
        types: nodeExtensions
          .filter((extension) => extension.name !== "text")
          .map((extension) => extension.name),
        attributes: {
          dir: {
            default: direction,
            parseHTML: (element) => {
              const dir = element.getAttribute("dir");

              if (dir === "ltr" || dir === "rtl" || dir === "auto") {
                return dir;
              }

              return direction;
            },
            renderHTML: (attributes): Record<string, string> => (
              attributes.dir
                ? { dir: String(attributes.dir) }
                : {}
            ),
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("textDirection"),
        props: {
          attributes: (): Record<string, string> => {
            const direction = this.editor.options.coreExtensionOptions?.textDirection?.direction;

            if (!direction) {
              return {};
            }

            return {
              dir: direction,
            };
          },
        },
      }),
    ];
  },
});
