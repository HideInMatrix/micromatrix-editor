import { Extension } from "@mxm-editor/core";
import type { PluginKey } from "@mxm-editor/pm";
import {
  BubbleMenuPlugin,
  bubbleMenuPluginKey,
  type BubbleMenuAppendTo,
  type BubbleMenuPluginOptions,
  type BubbleMenuShouldShow,
  type BubbleMenuVirtualElement,
  type BubbleMenuVisibilityContextWithEditor,
} from "./bubble-menu-plugin";

export interface BubbleMenuOptions {
  element: HTMLElement | null;
  pluginKey: string | PluginKey;
  updateDelay: number;
  resizeDelay: number;
  appendTo?: BubbleMenuAppendTo;
  shouldShow?: BubbleMenuShouldShow;
  getReferencedVirtualElement?: () => BubbleMenuVirtualElement | null;
  options: BubbleMenuPluginOptions;
  onShow?: (context: BubbleMenuVisibilityContextWithEditor) => void;
  onHide?: (context: BubbleMenuVisibilityContextWithEditor) => void;
  onUpdate?: (context: BubbleMenuVisibilityContextWithEditor) => void;
  onDestroy?: (context: BubbleMenuVisibilityContextWithEditor) => void;
}

export const BubbleMenu = Extension.create<BubbleMenuOptions>({
  name: "bubbleMenu",

  addOptions() {
    return {
      element: null,
      pluginKey: bubbleMenuPluginKey,
      updateDelay: 0,
      resizeDelay: 0,
      appendTo: undefined,
      shouldShow: undefined,
      getReferencedVirtualElement: undefined,
      options: {},
      onShow: undefined,
      onHide: undefined,
      onUpdate: undefined,
      onDestroy: undefined,
    };
  },

  addProseMirrorPlugins() {
    if (!this.options.element) {
      return [];
    }

    return [
      BubbleMenuPlugin({
        appendTo: this.options.appendTo,
        editor: this.editor,
        element: this.options.element,
        getReferencedVirtualElement: this.options.getReferencedVirtualElement,
        onDestroy: this.options.onDestroy,
        onHide: this.options.onHide,
        onShow: this.options.onShow,
        onUpdate: this.options.onUpdate,
        options: this.options.options,
        pluginKey: this.options.pluginKey,
        resizeDelay: this.options.resizeDelay,
        shouldShow: this.options.shouldShow,
        updateDelay: this.options.updateDelay,
      }),
    ];
  },
});
