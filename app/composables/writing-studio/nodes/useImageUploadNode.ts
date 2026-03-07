import { mergeAttributes, Node } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import ImageUploadNodeView from "~/components/writing-studio/node-view/ImageUpload.vue";
import type { ImageAlignValue } from "../extensions/useImageExtension";
import type { WritingStudioImageUploader } from "../actions/useOtherActions";

export type WritingStudioImageUploadNodeOptions = {
  HTMLAttributes: Record<string, unknown>;
  maxFileSizeMb: number;
  defaultAlign: ImageAlignValue;
  isApiUploadEnabled: boolean;
  uploader?: WritingStudioImageUploader;
};

export const WritingStudioImageUploadNode = Node.create<WritingStudioImageUploadNodeOptions>({
  name: "imageUpload",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addOptions() {
    return {
      HTMLAttributes: {},
      maxFileSizeMb: 5,
      defaultAlign: "center",
      isApiUploadEnabled: false,
      uploader: undefined,
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-type="ws-image-upload"]',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "ws-image-upload",
      }),
    ];
  },
  renderMarkdown() {
    return "";
  },
  addNodeView() {
    return VueNodeViewRenderer(ImageUploadNodeView);
  },
});
