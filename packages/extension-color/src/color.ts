import { Extension } from "@mxm-editor/core";

export interface ColorOptions {
  types: string[];
}

export const Color = Extension.create<ColorOptions>({
  name: "color",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const style = element.getAttribute("style");

              if (style) {
                const declarations = style
                  .split(";")
                  .map((item) => item.trim())
                  .filter(Boolean);

                for (let index = declarations.length - 1; index >= 0; index -= 1) {
                  const parts = declarations[index].split(":");

                  if (parts.length < 2) {
                    continue;
                  }

                  const property = parts[0].trim().toLowerCase();
                  const value = parts.slice(1).join(":").trim();

                  if (property === "color") {
                    return value.replace(/['"]+/g, "");
                  }
                }
              }

              return element.style.color?.replace(/['"]+/g, "") || null;
            },
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.color) {
                return {} as Record<string, string>;
              }

              return {
                style: `color: ${attributes.color}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setColor:
        (color: string) =>
        ({ commands }) =>
          commands.setTextStyle({ color }),
      unsetColor:
        () =>
        ({ commands }) =>
          commands.setTextStyle({ color: null })
          && commands.removeEmptyTextStyle(),
    };
  },
});
