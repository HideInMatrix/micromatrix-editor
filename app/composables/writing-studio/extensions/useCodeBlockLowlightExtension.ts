import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

const WritingStudioCodeBlockLowlight = CodeBlockLowlight.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            wrap: {
                default: false,
                parseHTML: (element) => {
                    return element.getAttribute("data-wrap") === "true";
                },
                renderHTML: (attributes) => {
                    if (!attributes.wrap) {
                        return {};
                    }

                    return {
                        "data-wrap": "true",
                    };
                },
            },
        };
    },
});

const codeBlockLanguageOptions = [
    "plaintext",
    ...lowlight
        .listLanguages()
        .filter(language => language !== "plaintext")
        .sort((first, second) => first.localeCompare(second)),
];

export const useWritingStudioCodeBlockLanguages = () => {
  return codeBlockLanguageOptions;
};

export const useWritingStudioCodeBlockLowlightExtension = () => {
  return WritingStudioCodeBlockLowlight.configure({
    lowlight,
    languageClassPrefix: "language-",
    defaultLanguage: "plaintext",
    exitOnTripleEnter: true,
    exitOnArrowDown: true,
    HTMLAttributes: {
      class: "ws-code-block",
    },
  });
};
