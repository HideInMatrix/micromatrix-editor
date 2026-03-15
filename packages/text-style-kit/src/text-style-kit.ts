import { Extension } from "@mxm-editor/core";
import {
  BackgroundColor,
  type BackgroundColorOptions,
} from "@mxm-editor/extension-background-color";
import { Color, type ColorOptions } from "@mxm-editor/extension-color";
import {
  FontFamily,
  type FontFamilyOptions,
} from "@mxm-editor/extension-font-family";
import {
  FontSize,
  type FontSizeOptions,
} from "@mxm-editor/extension-font-size";
import {
  LineHeight,
  type LineHeightOptions,
} from "@mxm-editor/extension-line-height";
import {
  TextStyle,
  type TextStyleOptions,
} from "@mxm-editor/extension-text-style";

export interface TextStyleKitOptions {
  textStyle: false | Partial<TextStyleOptions>;
  color: false | Partial<ColorOptions>;
  backgroundColor: false | Partial<BackgroundColorOptions>;
  fontFamily: false | Partial<FontFamilyOptions>;
  fontSize: false | Partial<FontSizeOptions>;
  lineHeight: false | Partial<LineHeightOptions>;
}

export const TextStyleKit = Extension.create<TextStyleKitOptions>({
  name: "textStyleKit",

  addOptions() {
    return {
      textStyle: {},
      color: {},
      backgroundColor: {},
      fontFamily: {},
      fontSize: {},
      lineHeight: {},
    };
  },

  addExtensions() {
    const extensions = [];

    if (this.options.textStyle !== false) {
      extensions.push(TextStyle.configure(this.options.textStyle));
    }

    if (this.options.color !== false) {
      extensions.push(Color.configure(this.options.color));
    }

    if (this.options.backgroundColor !== false) {
      extensions.push(BackgroundColor.configure(this.options.backgroundColor));
    }

    if (this.options.fontFamily !== false) {
      extensions.push(FontFamily.configure(this.options.fontFamily));
    }

    if (this.options.fontSize !== false) {
      extensions.push(FontSize.configure(this.options.fontSize));
    }

    if (this.options.lineHeight !== false) {
      extensions.push(LineHeight.configure(this.options.lineHeight));
    }

    return extensions;
  },
});
