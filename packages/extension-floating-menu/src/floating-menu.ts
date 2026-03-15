import { Extension } from "@mxm-editor/core";
import type { PluginKey } from "@mxm-editor/pm";
import {
  FloatingMenuPlugin,
  floatingMenuPluginKey,
  type FloatingMenuAppendTo,
  type FloatingMenuPluginOptions,
  type FloatingMenuShouldShow,
  type FloatingMenuVisibilityContextWithEditor,
} from "./floating-menu-plugin";

export interface FloatingMenuOptions {
  element: HTMLElement | null;
  pluginKey: string | PluginKey;
  updateDelay: number;
  resizeDelay: number;
  appendTo?: FloatingMenuAppendTo;
  shouldShow?: FloatingMenuShouldShow;
  options: FloatingMenuPluginOptions;
  onShow?: (context: FloatingMenuVisibilityContextWithEditor) => void;
  onHide?: (context: FloatingMenuVisibilityContextWithEditor) => void;
  onUpdate?: (context: FloatingMenuVisibilityContextWithEditor) => void;
  onDestroy?: (context: FloatingMenuVisibilityContextWithEditor) => void;
}

export const FloatingMenu = Extension.create<FloatingMenuOptions>({
  name: "floatingMenu",

  addOptions() {
    return {
      element: null,
      pluginKey: floatingMenuPluginKey,
      updateDelay: 0,
      resizeDelay: 0,
      appendTo: undefined,
      shouldShow: undefined,
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
      FloatingMenuPlugin({
        appendTo: this.options.appendTo,
        editor: this.editor,
        element: this.options.element,
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
