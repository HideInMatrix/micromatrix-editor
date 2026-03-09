import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";

// 代码高亮实例（内置常见语言）
const lowlight = createLowlight(common);

// 扩展代码块：新增 wrap 属性
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

// 代码块语言选项（默认 plaintext）
const codeBlockLanguageOptions = [
    "plaintext",
    ...lowlight
        .listLanguages()
        .filter(language => language !== "plaintext")
	.sort((first, second) => first.localeCompare(second)),
];

// 获取代码语言列表
export const useWritingStudioCodeBlockLanguages = () => {
  return codeBlockLanguageOptions;
};

// 获取代码块扩展配置
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
