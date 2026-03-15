import { Extension } from "@mxm-editor/core";
import {
  redo,
  undo,
  ySyncPlugin,
  yUndoPlugin,
  yUndoPluginKey,
} from "y-prosemirror";
import { Doc, type UndoManager, type XmlFragment } from "yjs";

type YSyncOptions = NonNullable<Parameters<typeof ySyncPlugin>[1]>;
type YUndoOptions = Parameters<typeof yUndoPlugin>[0];

export interface CollaborationOptions {
  document: Doc | null;
  field: string;
  fragment: XmlFragment | null;
  onFirstRender?: () => void;
  ySyncOptions?: Omit<YSyncOptions, "onFirstRender">;
  yUndoOptions?: YUndoOptions;
}

export interface CollaborationStorage {
  fragment: XmlFragment | null;
  undoManager: UndoManager | null;
  isDisabled: boolean;
}

function resolveFragment(options: CollaborationOptions) {
  if (options.fragment) {
    return options.fragment;
  }

  if (options.document) {
    return options.document.getXmlFragment(options.field);
  }

  return new Doc().getXmlFragment(options.field);
}

export const Collaboration = Extension.create<
  CollaborationOptions,
  CollaborationStorage
>({
  name: "collaboration",

  priority: 1000,

  addOptions() {
    return {
      document: null,
      field: "default",
      fragment: null,
      onFirstRender: undefined,
      ySyncOptions: undefined,
      yUndoOptions: undefined,
    };
  },

  addStorage() {
    return {
      fragment: null,
      undoManager: null,
      isDisabled: false,
    };
  },

  onCreate() {
    this.storage.undoManager =
      yUndoPluginKey.getState(this.editor.state)?.undoManager ?? null;
  },

  onUpdate() {
    this.storage.undoManager =
      yUndoPluginKey.getState(this.editor.state)?.undoManager ?? null;
  },

  addCommands() {
    return {
      undo:
        () =>
        ({ state, dispatch }) => {
          const pluginState = yUndoPluginKey.getState(state);

          if (!pluginState) {
            return false;
          }

          if (!dispatch) {
            return pluginState.hasUndoOps;
          }

          return undo(state);
        },
      redo:
        () =>
        ({ state, dispatch }) => {
          const pluginState = yUndoPluginKey.getState(state);

          if (!pluginState) {
            return false;
          }

          if (!dispatch) {
            return pluginState.hasRedoOps;
          }

          return redo(state);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-z": () => this.editor.commands.undo(),
      "Mod-y": () => this.editor.commands.redo(),
      "Shift-Mod-z": () => this.editor.commands.redo(),
    };
  },

  addProseMirrorPlugins() {
    const fragment = resolveFragment(this.options);

    this.storage.fragment = fragment;

    return [
      ySyncPlugin(fragment, {
        ...this.options.ySyncOptions,
        onFirstRender: this.options.onFirstRender,
      }),
      yUndoPlugin(this.options.yUndoOptions),
    ];
  },
});
