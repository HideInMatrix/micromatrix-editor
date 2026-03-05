import { useI18n } from "#imports";
import type { WritingStudioEditorRef } from "./useWritingStudioActionTypes";

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

export const useWritingStudioOtherActions = (editor: WritingStudioEditorRef) => {
  const { t } = useI18n();

  const setImageAlign = (align: "left" | "center" | "right") => {
    editor.value?.chain().focus().updateAttributes("image", { align }).run();
  };

  const resetImageSize = () => {
    editor.value?.chain().focus().updateAttributes("image", { width: null, height: null }).run();
  };

  const setTextAlign = (alignment: "left" | "center" | "right" | "justify") => {
    editor.value?.chain().focus().setTextAlign(alignment).run();
  };

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

  const insertImage = () => {
    const src = promptValue(
      t("writingStudio.prompts.image"),
      "https://",
    );

    if (!src) {
      return;
    }

    editor.value?.chain().focus().setImage({ src }).run();
  };

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
    resetImageSize,
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
    insertImage,
    insertAudio,
    insertYoutube,
    insertTwitch,
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
