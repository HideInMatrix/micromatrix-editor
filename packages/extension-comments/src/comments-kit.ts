import { Extension } from "@mxm-editor/core";
import { Comments } from "./comments";
import { createDefaultCommentsOptions } from "./defaults";
import { InlineThread } from "./inline-thread";
import type { CommentsOptions } from "./types";

export const CommentsKit = Extension.create<CommentsOptions>({
  name: "commentsKit",

  addOptions() {
    return createDefaultCommentsOptions();
  },

  addExtensions() {
    return [
      InlineThread,
      Comments.configure(this.options),
    ];
  },
});
