import {
  inputRules,
  keymap,
  type NodeViewConstructor,
  Plugin,
  Schema,
} from "@mxm-editor/pm";
import type { Editor } from "./Editor";
import {
  getAttributesForExtensionFromResolvedExtensions,
  getRenderedAttributes,
  getSchemaByResolvedExtensions,
  resolveExtensions,
} from "./helpers/schema";
import { pasteRulesPlugin } from "./PasteRule";
import type {
  AnyExtension,
  ExtensionConfig,
  NodeViewRenderer,
  NodeConfig,
  RawCommands,
  ExtensionLike,
} from "./types";

function includesExtension(
  setting: Editor["options"]["enableInputRules"],
  extension: AnyExtension,
) {
  if (setting === undefined || setting === true) {
    return true;
  }

  if (setting === false) {
    return false;
  }

  return setting.some((item) =>
    typeof item === "string" ? item === extension.name : item.name === extension.name,
  );
}

export class ExtensionManager {
  readonly editor: Editor;

  readonly extensions: AnyExtension[];

  readonly schema: Schema;

  readonly storage: Record<string, unknown>;

  private proseMirrorPluginsCache: Plugin[] | null = null;

  constructor(extensions: AnyExtension[], editor: Editor) {
    this.editor = editor;
    this.extensions = resolveExtensions(
      extensions,
      (extension) => extension.createContext(this.editor),
    );
    this.storage = Object.fromEntries(
      this.extensions.map((extension) => [extension.name, extension.storage]),
    );
    this.onExtensionsResolved();
    this.schema = getSchemaByResolvedExtensions(
      this.extensions,
      (extension) => extension.createContext(this.editor),
    );
  }

  get commands(): RawCommands {
    return this.extensions.reduce<RawCommands>((commands, extension) => {
      const addCommands = extension.config.addCommands;

      if (!addCommands) {
        return commands;
      }

      return {
        ...commands,
        ...addCommands.call(extension.createContext(this.editor)),
      };
    }, {});
  }

  get plugins(): Plugin[] {
    const keyboardPlugins = this.extensions.flatMap((extension) => {
      const context = extension.createContext(this.editor);

      if (!extension.config.addKeyboardShortcuts) {
        return [];
      }

      return [keymap(extension.config.addKeyboardShortcuts.call(context))];
    });
    const inputRulePlugins = this.extensions.flatMap((extension) => {
      if (!includesExtension(this.editor.options.enableInputRules, extension)) {
        return [];
      }

      const context = extension.createContext(this.editor);
      const rules = extension.config.addInputRules?.call(context) ?? [];

      return rules.length ? [inputRules({ rules })] : [];
    });
    const pasteRules = this.extensions.flatMap((extension) => {
      if (!includesExtension(this.editor.options.enablePasteRules, extension)) {
        return [];
      }

      const context = extension.createContext(this.editor);

      return extension.config.addPasteRules?.call(context) ?? [];
    });
    const proseMirrorPlugins = this.proseMirrorPluginsCache
      ?? this.extensions.flatMap((extension) => {
        const context = extension.createContext(this.editor);

        return extension.config.addProseMirrorPlugins?.call(context) ?? [];
      });

    this.proseMirrorPluginsCache = proseMirrorPlugins;

    return [
      ...keyboardPlugins,
      ...inputRulePlugins,
      ...(pasteRules.length ? [pasteRulesPlugin(pasteRules)] : []),
      ...proseMirrorPlugins,
    ];
  }

  get nodeViews(): Record<string, NodeViewConstructor> {
    const nodes = this.extensions.filter(
      (extension): extension is ExtensionLike<any, any, NodeConfig<any, any>> =>
        extension.type === "node" && Boolean(extension.config.addNodeView),
    );

    return Object.fromEntries(
      nodes.map((node) => {
        const context = node.createContext(this.editor);
        const renderNodeView = node.config.addNodeView?.call(context) as
          | NodeViewRenderer
          | undefined;
        const attributes = getAttributesForExtensionFromResolvedExtensions(
          node,
          this.extensions,
          (extension) => extension.createContext(this.editor),
        );

        const nodeView: NodeViewConstructor = (
          pmNode,
          view,
          getPos,
          decorations,
          innerDecorations,
        ) =>
          renderNodeView!({
            node: pmNode,
            view,
            getPos,
            decorations,
            innerDecorations,
            editor: this.editor,
            extension: node,
            HTMLAttributes: getRenderedAttributes(pmNode.attrs, attributes),
            selected: false,
            updateAttributes: (nextAttributes) => {
              const position = typeof getPos === "function" ? getPos() : undefined;

              if (typeof position !== "number") {
                return;
              }

              const currentNode = view.state.doc.nodeAt(position);

              if (!currentNode) {
                return;
              }

              view.dispatch(
                view.state.tr.setNodeMarkup(position, undefined, {
                  ...currentNode.attrs,
                  ...nextAttributes,
                }),
              );
            },
            deleteNode: () => {
              const position = typeof getPos === "function" ? getPos() : undefined;

              if (typeof position !== "number") {
                return;
              }

              const currentNode = view.state.doc.nodeAt(position);

              if (!currentNode) {
                return;
              }

              view.dispatch(
                view.state.tr.delete(position, position + currentNode.nodeSize),
              );
            },
          });

        return [node.name, nodeView];
      }),
    );
  }

  onCreate() {
    this.extensions.forEach((extension) => {
      extension.config.onCreate?.call(extension.createContext(this.editor));
    });
  }

  onUpdate(transaction: Parameters<NonNullable<ExtensionConfig["onUpdate"]>>[0]["transaction"]) {
    this.extensions.forEach((extension) => {
      extension.config.onUpdate?.call(extension.createContext(this.editor), {
        transaction,
      });
    });
  }

  onDestroy() {
    this.extensions.forEach((extension) => {
      extension.config.onDestroy?.call(extension.createContext(this.editor));
    });
  }

  private onExtensionsResolved() {
    this.extensions.forEach((extension) => {
      extension.config.onExtensionsResolved?.call(
        extension.createContext(this.editor),
        {
          extensions: this.extensions,
        },
      );
    });
  }
}
