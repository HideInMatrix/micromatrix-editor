import { mergeAttributes, Node } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import WritingStudioImageUploadNodeView from "~/components/paper/WritingStudioImageUploadNodeView.vue";
import type { ImageAlignValue } from "../extensions/useTipTapImageExtension";
import type { WritingStudioImageUploader } from "../studio/useWritingStudioOtherActions";

export type TipTapImageUploadNodeOptions = {
  HTMLAttributes: Record<string, unknown>;
  maxFileSizeMb: number;
  defaultAlign: ImageAlignValue;
  isApiUploadEnabled: boolean;
  uploader?: WritingStudioImageUploader;
};

export const WritingStudioImageUploadNode = Node.create<TipTapImageUploadNodeOptions>({
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
    return VueNodeViewRenderer(WritingStudioImageUploadNodeView);
  },
});
