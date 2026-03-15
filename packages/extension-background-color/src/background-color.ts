import { Extension } from "@mxm-editor/core";

export interface BackgroundColorOptions {
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

export const BackgroundColor = Extension.create<BackgroundColorOptions>({
  name: "backgroundColor",

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
          backgroundColor: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              getStyleValue(element, "background-color"),
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.backgroundColor) {
                return {} as Record<string, string>;
              }

              return {
                style: `background-color: ${attributes.backgroundColor}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBackgroundColor:
        (backgroundColor: string) =>
        ({ commands }) =>
          commands.setTextStyle({ backgroundColor }),
      unsetBackgroundColor:
        () =>
        ({ commands }) =>
          commands.setTextStyle({ backgroundColor: null })
          && commands.removeEmptyTextStyle(),
    };
  },
});
