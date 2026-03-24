import {
  inputRules,
  keymap,
  type MarkViewConstructor,
  type NodeViewConstructor,
  Plugin,
  Schema,
  type Transaction,
  type EditorView,
} from "@mxm-editor/pm";
import type { Editor } from "./Editor";
import { getExtensionField } from "./helpers/getExtensionField";
import {
  flattenExtensions,
  getAttributesFromResolvedExtensions,
  getAttributesForExtensionFromResolvedExtensions,
  getRenderedAttributes,
  getSchemaByResolvedExtensions,
  resolveExtensions,
  sortExtensions,
} from "./helpers/schema";
import { pasteRulesPlugin } from "./PasteRule";
import { callOrReturn } from "./utilities";
import type {
  AnyExtension,
  DispatchTransactionProps,
  EditorEventMap,
  MarkConfig,
  MarkViewRenderer,
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
  static resolve = resolveExtensions;

  static sort = sortExtensions;

  static flatten = flattenExtensions;

  readonly editor: Editor;

  readonly baseExtensions: AnyExtension[];

  readonly extensions: AnyExtension[];

  readonly schema: Schema;

  readonly extensionOptions: Record<string, any>;

  readonly storage: Storage;

  readonly splittableMarks: string[] = [];

  private proseMirrorPluginsCache: Plugin[] | null = null;

  private removeEventListeners: Array<() => void> = [];

  constructor(extensions: AnyExtension[], editor: Editor) {
    this.editor = editor;
    this.baseExtensions = extensions;
    this.extensions = resolveExtensions(
      extensions,
      (extension) => extension.createContext(this.editor),
    );
    this.extensionOptions = Object.fromEntries(
      this.extensions.map((extension) => [extension.name, extension.options]),
    );
    this.schema = getSchemaByResolvedExtensions(
      this.extensions,
      (extension) => extension.createContext(this.editor),
    );
    this.storage = Object.fromEntries(
      this.extensions.map((extension) => [extension.name, extension.storage]),
    ) as Storage;
    this.setupExtensions();
    this.onExtensionsResolved();
  }

  get commands(): RawCommands {
    return this.extensions.reduce<RawCommands>((commands, extension) => {
      const addCommands = getExtensionField(
        extension,
        "addCommands",
        this.getContext(extension),
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

  get attributes() {
    return getAttributesFromResolvedExtensions(
      this.extensions,
      (extension) => this.getContext(extension),
    );
  }

  get plugins(): Plugin[] {
    const extensions = this.getPluginExtensions();
    const keyboardPlugins = extensions.flatMap((extension) => {
      const context = this.getContext(extension);
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
    const inputRulePlugins = extensions.flatMap((extension) => {
      if (!includesExtension(this.editor.options.enableInputRules, extension)) {
        return [];
      }

      const context = this.getContext(extension);
      const addInputRules = getExtensionField(
        extension,
        "addInputRules",
        context,
      ) as (() => ReturnType<typeof inputRules> extends never ? never[] : any[]) | undefined;
      const rules = addInputRules?.() ?? [];

      return rules.length ? [inputRules({ rules })] : [];
    });
    const pasteRules = extensions.flatMap((extension) => {
      if (!includesExtension(this.editor.options.enablePasteRules, extension)) {
        return [];
      }

      const context = this.getContext(extension);
      const addPasteRules = getExtensionField(
        extension,
        "addPasteRules",
        context,
      ) as (() => any[]) | undefined;

      return addPasteRules?.() ?? [];
    });
    const proseMirrorPlugins = this.proseMirrorPluginsCache
      ?? extensions.flatMap((extension) => {
        const context = this.getContext(extension);
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
        const context = this.getContext(node);
        const addNodeView = getExtensionField(
          node,
          "addNodeView",
          context,
        ) as
          | (() => NodeViewRenderer)
          | undefined;
        const attributes = getAttributesForExtensionFromResolvedExtensions(
          node,
          this.extensions,
          (extension) => this.getContext(extension),
        );
        const renderNodeView = addNodeView?.();

        if (!renderNodeView) {
          return [];
        }

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

  get markViews(): Record<string, MarkViewConstructor> {
    const marks = this.extensions.filter(
      (extension): extension is ExtensionLike<any, any, MarkConfig<any, any>> =>
        extension.type === "mark" && Boolean(extension.config.addMarkView),
    );

    return Object.fromEntries(
      marks.map((mark) => {
        const context = this.getContext(mark);
        const renderMarkView = getExtensionField(
          mark,
          "addMarkView",
          context,
        ) as
          | (() => MarkViewRenderer)
          | undefined;
        const attributes = getAttributesForExtensionFromResolvedExtensions(
          mark,
          this.extensions,
          (extension) => this.getContext(extension),
        );
        const createMarkView = renderMarkView?.();

        if (!createMarkView) {
          return [];
        }

        const markView: MarkViewConstructor = (
          pmMark,
          view,
          inline,
        ) =>
          createMarkView({
            mark: pmMark,
            view,
            inline,
            editor: this.editor,
            extension: mark,
            HTMLAttributes: getRenderedAttributes(pmMark.attrs, attributes),
            updateAttributes: (nextAttributes: Record<string, any>) => {
              const { state } = view;
              const { tr } = state;

              state.doc.descendants((node, pos) => {
                const from = tr.mapping.map(pos);
                const to = tr.mapping.map(pos) + node.nodeSize;
                const foundMark = node.marks.find((item) => item === pmMark);

                if (!foundMark) {
                  return;
                }

                tr.removeMark(from, to, pmMark.type);
                tr.addMark(from, to, pmMark.type.create({
                  ...pmMark.attrs,
                  ...nextAttributes,
                }));
              });

              if (tr.docChanged) {
                view.dispatch(tr);
              }
            },
          });

        return [mark.name, markView];
      }),
    );
  }

  dispatchTransaction(baseDispatch: (transaction: Transaction) => void) {
    const extensions = this.getPluginExtensions();

    return extensions.reduceRight<(transaction: Transaction) => void>(
      (next, extension) => {
        const dispatchTransaction = getExtensionField(
          extension,
          "dispatchTransaction",
          this.getContext(extension),
        ) as ((props: DispatchTransactionProps) => void) | undefined;

        if (!dispatchTransaction) {
          return next;
        }

        return (transaction: Transaction) => {
          dispatchTransaction({
            transaction,
            next,
          });
        };
      },
      baseDispatch,
    );
  }

  transformPastedHTML(
    baseTransform?: (html: string, view?: EditorView) => string,
  ) {
    return [...this.extensions].sort((a, b) => b.priority - a.priority).reduce(
      (transform, extension) => {
        const transformPastedHTML = getExtensionField(
          extension,
          "transformPastedHTML",
          this.getContext(extension),
        ) as ((html: string) => string) | undefined;

        if (!transformPastedHTML) {
          return transform;
        }

        return (html: string, view?: EditorView) =>
          transformPastedHTML(transform(html, view));
      },
      baseTransform ?? ((html: string) => html),
    );
  }

  private getContext(extension: AnyExtension) {
    const context = extension.createContext(this.editor);

    return {
      ...context,
      options: this.extensionOptions[extension.name] ?? context.options,
      storage: this.storage[extension.name] ?? context.storage,
    };
  }

  private getPluginExtensions() {
    return sortExtensions([...this.extensions].reverse());
  }

  private setupExtensions() {
    this.extensions.forEach((extension) => {
      const context = this.getContext(extension);

      if (extension.type === "mark") {
        const keepOnSplit = callOrReturn(
          getExtensionField(
            extension,
            "keepOnSplit",
            context,
          ) ?? true,
        );

        if (keepOnSplit) {
          this.splittableMarks.push(extension.name);
        }
      }

      const onBeforeCreate = getExtensionField(
        extension,
        "onBeforeCreate",
        context,
      ) as ((payload: EditorEventMap["beforeCreate"]) => void) | undefined;
      const onCreate = getExtensionField(
        extension,
        "onCreate",
        context,
      ) as ((payload: EditorEventMap["create"]) => void) | undefined;
      const onUpdate = getExtensionField(
        extension,
        "onUpdate",
        context,
      ) as ((payload: EditorEventMap["update"]) => void) | undefined;
      const onSelectionUpdate = getExtensionField(
        extension,
        "onSelectionUpdate",
        context,
      ) as ((payload: EditorEventMap["selectionUpdate"]) => void) | undefined;
      const onTransaction = getExtensionField(
        extension,
        "onTransaction",
        context,
      ) as ((payload: EditorEventMap["transaction"]) => void) | undefined;
      const onFocus = getExtensionField(
        extension,
        "onFocus",
        context,
      ) as ((payload: EditorEventMap["focus"]) => void) | undefined;
      const onBlur = getExtensionField(
        extension,
        "onBlur",
        context,
      ) as ((payload: EditorEventMap["blur"]) => void) | undefined;
      const onDestroy = getExtensionField(
        extension,
        "onDestroy",
        context,
      ) as ((payload: EditorEventMap["destroy"]) => void) | undefined;

      if (onBeforeCreate) {
        this.removeEventListeners.push(this.editor.on("beforeCreate", onBeforeCreate));
      }

      if (onCreate) {
        this.removeEventListeners.push(this.editor.on("create", onCreate));
      }

      if (onUpdate) {
        this.removeEventListeners.push(this.editor.on("update", onUpdate));
      }

      if (onSelectionUpdate) {
        this.removeEventListeners.push(this.editor.on("selectionUpdate", onSelectionUpdate));
      }

      if (onTransaction) {
        this.removeEventListeners.push(this.editor.on("transaction", onTransaction));
      }

      if (onFocus) {
        this.removeEventListeners.push(this.editor.on("focus", onFocus));
      }

      if (onBlur) {
        this.removeEventListeners.push(this.editor.on("blur", onBlur));
      }

      if (onDestroy) {
        this.removeEventListeners.push(this.editor.on("destroy", onDestroy));
      }
    });
  }

  private onExtensionsResolved() {
    this.extensions.forEach((extension) => {
      const onExtensionsResolved = getExtensionField(
        extension,
        "onExtensionsResolved",
        {
          ...this.getContext(extension),
          extensions: this.extensions,
        },
      ) as ((props: { extensions: AnyExtension[] }) => void) | undefined;

      onExtensionsResolved?.({
        extensions: this.extensions,
      });
    });
  }

  destroy() {
    this.removeEventListeners.forEach((removeListener) => {
      removeListener();
    });
    this.removeEventListeners = [];
    this.proseMirrorPluginsCache = null;
  }
}
