import { useI18n } from "#imports";
import type { ImageAlignValue } from "../extensions/useImageExtension";
import type { WritingStudioEditorRef } from "../types/editor";

// 浏览器 prompt 封装（返回去空格后的字符串）
const promptValue = (message: string, defaultValue = "") => {
  if (!import.meta.client) {
    return null;
  }

  const input = window.prompt(message, defaultValue);
  if (input === null) {
    return null;
  }

  return input.trim();
};

// 上传进度回调
export type WritingStudioImageUploadProgressHandler = (progress: number) => void;

// 上传后图片结构
export type WritingStudioUploadedImage = {
  src: string;
  alt?: string;
  title?: string;
  width?: number | null;
  height?: number | null;
  align?: ImageAlignValue;
};

// 自定义上传器函数签名
export type WritingStudioImageUploader = (
  file: File,
  onProgress: WritingStudioImageUploadProgressHandler,
) => Promise<string | WritingStudioUploadedImage>;

// 从文件插入图片时可选参数
export type InsertImageFromFileOptions = {
  onProgress?: WritingStudioImageUploadProgressHandler;
  uploader?: WritingStudioImageUploader;
  align?: ImageAlignValue;
  alt?: string;
  title?: string;
};

// 将图片文件读取为 data URL（无后端上传时兜底）
const readImageAsDataUrl = (
  file: File,
  onProgress?: WritingStudioImageUploadProgressHandler,
) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) {
        return;
      }

      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress(percent);
    };

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Invalid image data"));
        return;
      }

      onProgress?.(100);
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read image file"));
    };

    reader.readAsDataURL(file);
  });

// 杂项编辑动作（文本样式、媒体、表格等）
export const useWritingStudioOtherActions = (editor: WritingStudioEditorRef) => {
  const { t } = useI18n();

  // 对齐属性写入失败时，补一层 DOM 样式兜底
  const applyImageAlignDomFallback = (imagePos: number, align: "left" | "center" | "right") => {
    if (!editor.value) {
      return;
    }

    const nodeDom = editor.value.view.nodeDOM(imagePos) as HTMLElement | null;
    const wrapper = nodeDom?.querySelector?.("[data-resize-wrapper]") as HTMLElement | null;
    if (!wrapper) {
      return;
    }

    wrapper.style.display = "block";
    wrapper.style.width = "fit-content";
    wrapper.style.maxWidth = "100%";

    if (align === "left") {
      wrapper.style.marginLeft = "0";
      wrapper.style.marginRight = "auto";
      return;
    }

    if (align === "center") {
      wrapper.style.marginLeft = "auto";
      wrapper.style.marginRight = "auto";
      return;
    }

    wrapper.style.marginLeft = "auto";
    wrapper.style.marginRight = "0";
  };

  // 获取当前选中的图片节点位置
  const getSelectedImagePos = () => {
    if (!editor.value) {
      return null;
    }

    const selection = editor.value.state.selection as any;
    if (selection?.node?.type?.name === "image" && typeof selection.from === "number") {
      return selection.from;
    }

    return null;
  };

  // 设置图片对齐（含节点选中与兜底样式）
  const setImageAlign = (align: "left" | "center" | "right") => {
    const imagePos = getSelectedImagePos();
    const chain = editor.value?.chain() as any;
    if (!chain) {
      return;
    }

    chain.focus();
    if (typeof imagePos === "number" && chain.setNodeSelection) {
      chain.setNodeSelection(imagePos);
    }

    if (!chain?.setImageAlign) {
      return;
    }

    const success = chain.setImageAlign(align).run();
    if (success && typeof imagePos === "number") {
      applyImageAlignDomFallback(imagePos, align);
    }
  };



  // 设置段落/标题文本对齐
  const setTextAlign = (alignment: "left" | "center" | "right" | "justify") => {
    editor.value?.chain().focus().setTextAlign(alignment).run();
  };

  // 文本 mark 切换
  const toggleBold = () => {
    editor.value?.chain().focus().toggleBold().run();
  };

  const toggleCode = () => {
    editor.value?.chain().focus().toggleCode().run();
  };

  const toggleHighlight = () => {
    editor.value?.chain().focus().toggleHighlight({ color: "#fde047" }).run();
  };

  const toggleItalic = () => {
    editor.value?.chain().focus().toggleItalic().run();
  };

  // 通过 prompt 设置/移除链接
  const toggleLink = () => {
    if (!editor.value) {
      return;
    }

    const previousUrl = editor.value.getAttributes("link").href as string | undefined;
    const url = promptValue(
      t("writingStudio.prompts.link"),
      previousUrl ?? "https://",
    );

    if (url === null) {
      return;
    }

    const chain = editor.value.chain().focus().extendMarkRange("link");
    if (!url) {
      chain.unsetLink().run();
      return;
    }

    chain.setLink({ href: url }).run();
  };

  const toggleTextStyle = () => {
    editor.value?.chain().focus().toggleTextStyle().run();
  };

  const toggleStrike = () => {
    editor.value?.chain().focus().toggleStrike().run();
  };

  const toggleSubscript = () => {
    editor.value?.chain().focus().toggleSubscript().run();
  };

  const toggleSuperscript = () => {
    editor.value?.chain().focus().toggleSuperscript().run();
  };

  const toggleUnderline = () => {
    editor.value?.chain().focus().toggleUnderline().run();
  };

  // 通过 URL 插入图片
  const insertImageByUrl = (src: string) => {
    const normalizedSrc = src.trim();
    if (!normalizedSrc) {
      return false;
    }

    const chain = editor.value?.chain().focus() as any;
    if (!chain?.setImageWithAlignment) {
      return false;
    }

    return chain.setImageWithAlignment({ src: normalizedSrc }).run();
  };

  // 交互式输入 URL 后插入图片
  const insertImage = () => {
    const src = promptValue(
      t("writingStudio.prompts.image"),
      "https://",
    );

    if (!src) {
      return;
    }

    insertImageByUrl(src);
  };

  // 插入上传占位节点
  const insertImageUpload = () => {
    editor.value?.chain().focus().insertContent({
      type: "imageUpload",
    }).run();
  };

  // 从本地文件插入图片（支持自定义上传器与进度）
  const insertImageFromFile = async (
    file: File,
    options?: InsertImageFromFileOptions,
  ): Promise<boolean> => {
    if (!editor.value || !import.meta.client) {
      return false;
    }

    if (!file.type.startsWith("image/")) {
      return false;
    }

    const onProgress = options?.onProgress;

    try {
      const fallbackAlt = file.name || undefined;
      let uploaded: WritingStudioUploadedImage;

      if (options?.uploader) {
        const response = await options.uploader(file, (progress) => {
          onProgress?.(progress);
        });

        if (typeof response === "string") {
          uploaded = {
            src: response,
            alt: options.alt ?? fallbackAlt,
            title: options.title,
            align: options.align,
          };
        } else {
          uploaded = {
            ...response,
            src: response.src,
            alt: response.alt ?? options.alt ?? fallbackAlt,
            title: response.title ?? options.title,
            align: response.align ?? options.align,
          };
        }
      } else {
        const src = await readImageAsDataUrl(file, onProgress);
        uploaded = {
          src,
          alt: options?.alt ?? fallbackAlt,
          title: options?.title,
          align: options?.align,
        };
      }

      if (!uploaded.src || uploaded.src.trim().length === 0) {
        return false;
      }

      const chain = editor.value.chain().focus() as any;
      if (!chain?.setImageWithAlignment) {
        return false;
      }

      const success = chain
        .setImageWithAlignment({
          ...uploaded,
        })
        .run();

      if (!success) {
        return false;
      }

      onProgress?.(100);
      return true;
    } catch {
      return false;
    }
  };

  // 媒体节点插入
  const insertAudio = () => {
    const src = promptValue(
      t("writingStudio.prompts.audio"),
      "https://",
    );

    if (!src) {
      return;
    }

    editor.value?.chain().focus().setAudio({ src }).run();
  };

  const insertYoutube = () => {
    const src = promptValue(
      t("writingStudio.prompts.youtube"),
      "https://www.youtube.com/watch?v=",
    );

    if (!src) {
      return;
    }

    editor.value?.chain().focus().setYoutubeVideo({ src }).run();
  };

  const insertTwitch = () => {
    const src = promptValue(
      t("writingStudio.prompts.twitch"),
      "https://www.twitch.tv/videos/",
    );

    if (!src) {
      return;
    }

    editor.value?.chain().focus().setTwitchVideo({ src }).run();
  };

  const insertInlineMath = () => {
    const latex = promptValue(
      t("writingStudio.prompts.inlineMath"),
      "E = mc^2",
    );

    if (!latex) {
      return;
    }

    const chain = editor.value?.chain().focus() as any;
    chain?.insertInlineMath?.({ latex }).run();
  };

  const insertBlockMath = () => {
    const latex = promptValue(
      t("writingStudio.prompts.blockMath"),
      "\\sum_{i=1}^{n} x_i",
    );

    if (!latex) {
      return;
    }

    const chain = editor.value?.chain().focus() as any;
    chain?.insertBlockMath?.({ latex }).run();
  };

  // 插入 emoji，失败时回退为 shortcode 文本
  const insertEmoji = () => {
    if (!editor.value) {
      return;
    }

    const shortcode = promptValue(
      t("writingStudio.prompts.emoji"),
      "grinning",
    );

    if (!shortcode) {
      return;
    }

    const normalized = shortcode.replaceAll(":", "");
    const success = editor.value.chain().focus().setEmoji(normalized).run();

    if (!success) {
      editor.value.chain().focus().insertContent(`:${normalized}:`).run();
    }
  };

  // 插入 mention 节点
  const insertMention = () => {
    if (!editor.value) {
      return;
    }

    const mention = promptValue(
      t("writingStudio.prompts.mention"),
      "muyi",
    );

    if (!mention) {
      return;
    }

    const normalized = mention.replace(/^@+/, "");
    if (!normalized) {
      return;
    }

    editor.value.chain().focus().insertContent([
      {
        type: "mention",
        attrs: {
          id: normalized,
          label: normalized,
          mentionSuggestionChar: "@",
        },
      },
      {
        type: "text",
        text: " ",
      },
    ]).run();
  };

  // 表格结构操作
  const insertTable = () => {
    editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const addColumnBefore = () => {
    editor.value?.chain().focus().addColumnBefore().run();
  };

  const addColumnAfter = () => {
    editor.value?.chain().focus().addColumnAfter().run();
  };

  const deleteColumn = () => {
    editor.value?.chain().focus().deleteColumn().run();
  };

  const addRowBefore = () => {
    editor.value?.chain().focus().addRowBefore().run();
  };

  const addRowAfter = () => {
    editor.value?.chain().focus().addRowAfter().run();
  };

  const deleteRow = () => {
    editor.value?.chain().focus().deleteRow().run();
  };

  const toggleHeaderRow = () => {
    editor.value?.chain().focus().toggleHeaderRow().run();
  };

  const toggleHeaderColumn = () => {
    editor.value?.chain().focus().toggleHeaderColumn().run();
  };

  const mergeOrSplitCells = () => {
    editor.value?.chain().focus().mergeOrSplit().run();
  };

  const deleteTable = () => {
    editor.value?.chain().focus().deleteTable().run();
  };

  return {
    setImageAlign,
    setTextAlign,
    toggleBold,
    toggleCode,
    toggleHighlight,
    toggleItalic,
    toggleLink,
    toggleTextStyle,
    toggleStrike,
    toggleSubscript,
    toggleSuperscript,
    toggleUnderline,
    insertImageByUrl,
    insertImage,
    insertImageUpload,
    insertImageFromFile,
    insertAudio,
    insertYoutube,
    insertTwitch,
    insertInlineMath,
    insertBlockMath,
    insertEmoji,
    insertMention,
    insertTable,
    addColumnBefore,
    addColumnAfter,
    deleteColumn,
    addRowBefore,
    addRowAfter,
    deleteRow,
    toggleHeaderRow,
    toggleHeaderColumn,
    mergeOrSplitCells,
    deleteTable,
  };
};
