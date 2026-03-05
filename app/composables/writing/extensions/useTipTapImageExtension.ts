import { Image } from "@tiptap/extension-image";

type ImageAlignValue = "left" | "center" | "right";

const imageAlignValues: ImageAlignValue[] = ["left", "center", "right"];

const isImageAlignValue = (value: unknown): value is ImageAlignValue => {
    return typeof value === "string" && imageAlignValues.includes(value as ImageAlignValue);
};

const WritingStudioImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            align: {
                default: "center",
                parseHTML: (element) => {
                    const align = element.getAttribute("data-align");
                    return isImageAlignValue(align) ? align : "center";
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
});

export const useTipTapImageExtension = () => {
    return WritingStudioImage.configure({
        allowBase64: true,
        HTMLAttributes: {
            class: "ws-media ws-image",
        },
        resize: {
            enabled: true,
            minWidth: 120,
            minHeight: 80,
            alwaysPreserveAspectRatio: true,
        },
    });
};
