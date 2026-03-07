import { Image } from "@tiptap/extension-image";

export type ImageAlignValue = "left" | "center" | "right";

type SetImageWithAlignmentOptions = {
    src: string;
    alt?: string;
    title?: string;
    width?: number | null;
    height?: number | null;
    align?: ImageAlignValue;
};

const defaultImageAlign: ImageAlignValue = "left";

const imageAlignValues: ImageAlignValue[] = ["left", "center", "right"];

const isImageAlignValue = (value: unknown): value is ImageAlignValue => {
    return typeof value === "string" && imageAlignValues.includes(value as ImageAlignValue);
};

const normalizeImageAlign = (value: unknown): ImageAlignValue => {
    return isImageAlignValue(value) ? value : defaultImageAlign;
};

const WritingStudioImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            align: {
                default: defaultImageAlign,
                parseHTML: (element) => {
                    const align = element.getAttribute("data-align");
                    return normalizeImageAlign(align);
                },
                renderHTML: (attributes) => {
                    if (!isImageAlignValue(attributes.align)) {
                        return {};
                    }

                    return {
                        "data-align": attributes.align,
                    };
                },
            },
        };
    },
    addCommands() {
        return {
            ...this.parent?.(),
            setImageWithAlignment: (options: SetImageWithAlignmentOptions) => ({ commands }: any) => {
                const { align, ...restOptions } = options;

                return commands.insertContent({
                    type: this.name,
                    attrs: {
                        ...restOptions,
                        align: normalizeImageAlign(align),
                    },
                });
            },
            setImageAlign: (align: ImageAlignValue) => ({ commands, editor }: any) => {
                if (!editor.isActive(this.name)) {
                    return false;
                }

                return commands.updateAttributes(this.name, {
                    align: normalizeImageAlign(align),
                });
            },
            resetImageSize: () => ({ commands, editor }: any) => {
                if (!editor.isActive(this.name)) {
                    return false;
                }

                return commands.updateAttributes(this.name, {
                    width: null,
                    height: null,
                });
            },
        };
    },
});

export const useWritingStudioImageExtension = () => {
  return WritingStudioImage.configure({
    allowBase64: true,
    HTMLAttributes: {
      class: "ws-media ws-image",
    },
    resize: {
      enabled: true,
      directions: ["left", "right"],
      minWidth: 120,
      minHeight: 80,
      alwaysPreserveAspectRatio: true,
    },
  });
};
