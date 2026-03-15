import { Extension } from "@mxm-editor/core";

export interface FontSizeOptions {
  types: string[];
}

function getStyleValue(element: HTMLElement, property: string) {
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

      if (parts[0].trim().toLowerCase() === property) {
        return parts.slice(1).join(":").trim().replace(/['"]+/g, "");
      }
    }
  }

  return element.style.getPropertyValue(property).trim().replace(/['"]+/g, "") || null;
}

export const FontSize = Extension.create<FontSizeOptions>({
  name: "fontSize",

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
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              getStyleValue(element, "font-size"),
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.fontSize) {
                return {} as Record<string, string>;
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ commands }) =>
          commands.setTextStyle({ fontSize }),
      unsetFontSize:
        () =>
        ({ commands }) =>
          commands.setTextStyle({ fontSize: null })
          && commands.removeEmptyTextStyle(),
    };
  },
});
