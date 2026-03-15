import { Extension } from "@mxm-editor/core";

export interface FontFamilyOptions {
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

export const FontFamily = Extension.create<FontFamilyOptions>({
  name: "fontFamily",

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
          fontFamily: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              getStyleValue(element, "font-family"),
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.fontFamily) {
                return {} as Record<string, string>;
              }

              return {
                style: `font-family: ${attributes.fontFamily}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontFamily:
        (fontFamily: string) =>
        ({ commands }) =>
          commands.setTextStyle({ fontFamily }),
      unsetFontFamily:
        () =>
        ({ commands }) =>
          commands.setTextStyle({ fontFamily: null })
          && commands.removeEmptyTextStyle(),
    };
  },
});
