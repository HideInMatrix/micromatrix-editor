import {
  inputRules,
  keymap,
  type NodeViewConstructor,
  Plugin,
  Schema,
} from "@mxm-editor/pm";
import type { Editor } from "./Editor";
import { getExtensionField } from "./helpers/getExtensionField";
import {
  getAttributesForExtensionFromResolvedExtensions,
  getRenderedAttributes,
  getSchemaByResolvedExtensions,
  resolveExtensions,
} from "./helpers/schema";
import { pasteRulesPlugin } from "./PasteRule";
import { callOrReturn } from "./utilities";
import type {
  AnyExtension,
  ExtensionConfig,
  NodeViewRenderer,
  NodeConfig,
  RawCommands,
  Storage,
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

  readonly storage: Storage;

  readonly splittableMarks: string[];

  private proseMirrorPluginsCache: Plugin[] | null = null;

  constructor(extensions: AnyExtension[], editor: Editor) {
    this.editor = editor;
    this.extensions = resolveExtensions(
      extensions,
      (extension) => extension.createContext(this.editor),
    );
    this.storage = Object.fromEntries(
      this.extensions.map((extension) => [extension.name, extension.storage]),
    ) as Storage;
    this.splittableMarks = this.extensions.flatMap((extension) => {
      if (extension.type !== "mark") {
        return [];
      }

      const keepOnSplit = callOrReturn(
        getExtensionField(
          extension,
          "keepOnSplit",
          extension.createContext(this.editor),
        ) ?? true,
      );

      return keepOnSplit ? [extension.name] : [];
    });
    this.onExtensionsResolved();
    this.schema = getSchemaByResolvedExtensions(
      this.extensions,
      (extension) => extension.createContext(this.editor),
    );
  }

  get commands(): RawCommands {
    return this.extensions.reduce<RawCommands>((commands, extension) => {
      const addCommands = getExtensionField(
        extension,
        "addCommands",
        extension.createContext(this.editor),
      ) as (() => Partial<RawCommands>) | undefined;

      if (!addCommands) {
        return commands;
      }

      const extensionCommands = addCommands() as RawCommands;

      return {
        ...commands,
        ...extensionCommands,
      } as RawCommands;
    }, {} as RawCommands);
  }

  get plugins(): Plugin[] {
    const keyboardPlugins = this.extensions.flatMap((extension) => {
      const context = extension.createContext(this.editor);
      const addKeyboardShortcuts = getExtensionField(
        extension,
        "addKeyboardShortcuts",
        context,
      ) as (() => Record<string, () => boolean>) | undefined;

      if (!addKeyboardShortcuts) {
        return [];
      }

      return [keymap(addKeyboardShortcuts())];
    });
    const inputRulePlugins = this.extensions.flatMap((extension) => {
      if (!includesExtension(this.editor.options.enableInputRules, extension)) {
        return [];
      }

      const context = extension.createContext(this.editor);
      const addInputRules = getExtensionField(
        extension,
        "addInputRules",
        context,
      ) as (() => ReturnType<typeof inputRules> extends never ? never[] : any[]) | undefined;
      const rules = addInputRules?.() ?? [];

      return rules.length ? [inputRules({ rules })] : [];
    });
    const pasteRules = this.extensions.flatMap((extension) => {
      if (!includesExtension(this.editor.options.enablePasteRules, extension)) {
        return [];
      }

      const context = extension.createContext(this.editor);
      const addPasteRules = getExtensionField(
        extension,
        "addPasteRules",
        context,
      ) as (() => any[]) | undefined;

      return addPasteRules?.() ?? [];
    });
    const proseMirrorPlugins = this.proseMirrorPluginsCache
      ?? this.extensions.flatMap((extension) => {
        const context = extension.createContext(this.editor);
        const addProseMirrorPlugins = getExtensionField(
          extension,
          "addProseMirrorPlugins",
          context,
        ) as (() => Plugin[]) | undefined;

        return addProseMirrorPlugins?.() ?? [];
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
        const renderNodeView = getExtensionField(
          node,
          "addNodeView",
          context,
        ) as
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
      const onCreate = getExtensionField(
        extension,
        "onCreate",
        extension.createContext(this.editor),
      ) as (() => void) | undefined;

      onCreate?.();
    });
  }

  onUpdate(transaction: Parameters<NonNullable<ExtensionConfig["onUpdate"]>>[0]["transaction"]) {
    this.extensions.forEach((extension) => {
      const onUpdate = getExtensionField(
        extension,
        "onUpdate",
        extension.createContext(this.editor),
      ) as ((props: { transaction: typeof transaction }) => void) | undefined;

      onUpdate?.({
        transaction,
      });
    });
  }

  onBeforeCreate() {
    this.extensions.forEach((extension) => {
      const onBeforeCreate = getExtensionField(
        extension,
        "onBeforeCreate",
        extension.createContext(this.editor),
      ) as (() => void) | undefined;

      onBeforeCreate?.();
    });
  }

  onSelectionUpdate(
    transaction: Parameters<NonNullable<ExtensionConfig["onUpdate"]>>[0]["transaction"],
  ) {
    this.extensions.forEach((extension) => {
      const onSelectionUpdate = getExtensionField(
        extension,
        "onSelectionUpdate",
        extension.createContext(this.editor),
      ) as ((props: { transaction: typeof transaction }) => void) | undefined;

      onSelectionUpdate?.({
        transaction,
      });
    });
  }

  onTransaction(
    transaction: Parameters<NonNullable<ExtensionConfig["onUpdate"]>>[0]["transaction"],
  ) {
    this.extensions.forEach((extension) => {
      const onTransaction = getExtensionField(
        extension,
        "onTransaction",
        extension.createContext(this.editor),
      ) as ((props: { transaction: typeof transaction }) => void) | undefined;

      onTransaction?.({
        transaction,
      });
    });
  }

  onFocus(event: FocusEvent) {
    this.extensions.forEach((extension) => {
      const onFocus = getExtensionField(
        extension,
        "onFocus",
        extension.createContext(this.editor),
      ) as ((props: { event: FocusEvent }) => void) | undefined;

      onFocus?.({ event });
    });
  }

  onBlur(event: FocusEvent) {
    this.extensions.forEach((extension) => {
      const onBlur = getExtensionField(
        extension,
        "onBlur",
        extension.createContext(this.editor),
      ) as ((props: { event: FocusEvent }) => void) | undefined;

      onBlur?.({ event });
    });
  }

  onDestroy() {
    this.extensions.forEach((extension) => {
      const onDestroy = getExtensionField(
        extension,
        "onDestroy",
        extension.createContext(this.editor),
      ) as (() => void) | undefined;

      onDestroy?.();
    });
  }

  private onExtensionsResolved() {
    this.extensions.forEach((extension) => {
      const onExtensionsResolved = getExtensionField(
        extension,
        "onExtensionsResolved",
        extension.createContext(this.editor),
      ) as ((props: { extensions: AnyExtension[] }) => void) | undefined;

      onExtensionsResolved?.({
        extensions: this.extensions,
      });
    });
  }
}
