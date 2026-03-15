import { Extension, type Editor } from "@mxm-editor/core";
import { Plugin, PluginKey, type PluginKey as PluginKeyType } from "@mxm-editor/pm";

export type FileHandlerPasteHandler = (
  editor: Editor,
  files: File[],
  htmlContent: string,
) => void;

export type FileHandlerDropHandler = (
  editor: Editor,
  files: File[],
  pos: number,
) => void;

export interface FileHandlerOptions {
  onPaste?: FileHandlerPasteHandler;
  onDrop?: FileHandlerDropHandler;
  allowedMimeTypes?: string[];
}

interface FileHandlePluginOptions {
  key?: PluginKeyType;
  editor: Editor;
  onPaste?: FileHandlerPasteHandler;
  onDrop?: FileHandlerDropHandler;
  allowedMimeTypes?: string[];
}

function filterFiles(files: File[], allowedMimeTypes?: string[]) {
  if (!allowedMimeTypes?.length) {
    return files;
  }

  return files.filter((file) => allowedMimeTypes.includes(file.type));
}

export function FileHandlePlugin({
  key,
  editor,
  onPaste,
  onDrop,
  allowedMimeTypes,
}: FileHandlePluginOptions) {
  return new Plugin({
    key: key ?? new PluginKey("fileHandler"),
    props: {
      handleDrop(view, event) {
        if (!onDrop || !event.dataTransfer?.files.length) {
          return false;
        }

        const dropPos = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        const files = filterFiles(
          Array.from(event.dataTransfer.files),
          allowedMimeTypes,
        );

        if (!files.length) {
          return false;
        }

        event.preventDefault();
        event.stopPropagation();
        onDrop(editor, files, dropPos?.pos ?? 0);

        return true;
      },

      handlePaste(_view, event) {
        if (!onPaste || !event.clipboardData?.files.length) {
          return false;
        }

        const files = filterFiles(
          Array.from(event.clipboardData.files),
          allowedMimeTypes,
        );

        if (!files.length) {
          return false;
        }

        const htmlContent = event.clipboardData.getData("text/html") || "";

        event.preventDefault();
        event.stopPropagation();
        onPaste(editor, files, htmlContent);

        if (htmlContent.length > 0) {
          return false;
        }

        return true;
      },
    },
  });
}

export const FileHandler = Extension.create<FileHandlerOptions>({
  name: "fileHandler",

  addOptions() {
    return {
      onPaste: undefined,
      onDrop: undefined,
      allowedMimeTypes: undefined,
    };
  },

  addProseMirrorPlugins() {
    return [
      FileHandlePlugin({
        key: new PluginKey(this.name),
        editor: this.editor,
        allowedMimeTypes: this.options.allowedMimeTypes,
        onDrop: this.options.onDrop,
        onPaste: this.options.onPaste,
      }),
    ];
  },
});
