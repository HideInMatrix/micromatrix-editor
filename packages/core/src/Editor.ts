import {
  NodeSelection,
  Plugin,
  type PluginKey,
  Selection,
  DOMParser as ProseMirrorDOMParser,
  DOMSerializer,
  EditorState,
  EditorView,
  type ParseOptions,
  type Node as PMNode,
  type Node as ProseMirrorNode,
  type Transaction,
} from "@mxm-editor/pm";
import { CommandManager } from "./CommandManager";
import { createDocumentFromContent } from "./content";
import { createCoreCommands, resolveFocusSelection } from "./coreCommands";
import { EventEmitter } from "./EventEmitter";
import { ExtensionManager } from "./ExtensionManager";
import type {
  CanCommands,
  ChainedCommands,
  Content,
  EditorEventMap,
  EditorGetTextOptions,
  EditorOptions,
  FocusOptions,
  FocusPosition,
  PluginKeySource,
  RawCommands,
  ResolvedEditorOptions,
  SetContentOptions,
  SingleCommands,
} from "./types";
import { matchesAttributes } from "./utils";

function getPluginKeyValue(pluginKey: PluginKeySource) {
  if (typeof pluginKey === "string") {
    return pluginKey;
  }

  const key = (pluginKey as { key?: unknown }).key;

  return typeof key === "string" ? key : null;
}

function getMarkAtCursor(state: EditorState, name: string) {
  const markType = state.schema.marks[name];

  if (!markType || !state.selection.empty) {
    return null;
  }

  const directMark = markType.isInSet(
    state.storedMarks ?? state.selection.$from.marks(),
  );

  if (directMark) {
    return directMark;
  }

  const { $from } = state.selection;
  const after = $from.parent.childAfter($from.parentOffset).node;
  const afterMark = after ? markType.isInSet(after.marks) : null;

  if (afterMark) {
    return afterMark;
  }

  const before = $from.parent.childBefore($from.parentOffset).node;

  return before ? markType.isInSet(before.marks) : null;
}

export class Editor extends EventEmitter<EditorEventMap> {
  options: ResolvedEditorOptions;

  readonly extensionManager: ExtensionManager;

  readonly coreCommands: RawCommands;

  private readonly commandManager: CommandManager;

  private editorState: EditorState;

  private editorView: EditorView | null = null;

  private customPlugins: Plugin[] = [];

  private destroyed = false;

  constructor(options: EditorOptions = {}) {
    super();

    this.options = {
      element: null,
      content: null,
      extensions: [],
      autofocus: false,
      editable: true,
      parseOptions: undefined,
      enableInputRules: true,
      enablePasteRules: true,
      editorProps: {},
      onCreate: () => undefined,
      onUpdate: () => undefined,
      onDestroy: () => undefined,
      ...options,
    };

    this.extensionManager = new ExtensionManager(
      this.options.extensions,
      this,
    );
    this.coreCommands = createCoreCommands(this);
    this.commandManager = new CommandManager({ editor: this });
    this.editorState = this.createState(this.options.content);

    if (this.options.element) {
      this.mount(this.options.element);
    }
  }

  get schema() {
    return this.extensionManager.schema;
  }

  get storage() {
    return this.extensionManager.storage;
  }

  get state() {
    return this.editorView?.state ?? this.editorState;
  }

  get view() {
    return this.editorView;
  }

  get isEditable() {
    return this.options.editable;
  }

  get isFocused() {
    return this.editorView?.hasFocus() ?? false;
  }

  get isEmpty() {
    if (this.state.doc.textContent.length > 0) {
      return false;
    }

    if (this.state.doc.childCount !== 1) {
      return false;
    }

    const firstChild = this.state.doc.firstChild;

    return Boolean(
      firstChild
        && firstChild.isTextblock
        && firstChild.content.size === 0,
    );
  }

  get isDestroyed() {
    return this.destroyed;
  }

  get commands(): SingleCommands {
    return this.commandManager.commands;
  }

  chain(): ChainedCommands {
    return this.commandManager.chain();
  }

  can(): CanCommands {
    return this.commandManager.can();
  }

  mount(element: HTMLElement) {
    if (this.editorView) {
      this.unmount();
    }

    this.options.element = element;
    this.editorState = this.editorState.reconfigure({
      plugins: this.extensionManager.plugins,
    });

    this.editorView = new EditorView(element, {
      ...this.options.editorProps,
      state: this.editorState,
      dispatchTransaction: this.dispatchTransaction,
      editable: () => this.options.editable,
      nodeViews: this.extensionManager.nodeViews,
    });

    this.extensionManager.onCreate();
    this.emit("create", { editor: this });
    this.options.onCreate({ editor: this });

    this.focus(this.options.autofocus);
  }

  unmount() {
    this.editorView?.destroy();
    this.editorView = null;
  }

  destroy() {
    this.extensionManager.onDestroy();
    this.emit("destroy", { editor: this });
    this.options.onDestroy({ editor: this });
    this.unmount();
    this.removeAllListeners();
    this.destroyed = true;
  }

  setOptions(options: Partial<EditorOptions>) {
    this.options = {
      ...this.options,
      ...options,
    };

    this.reconfigureState();

    if (this.editorView) {
      this.editorView.setProps({
        ...this.options.editorProps,
        editable: () => this.options.editable,
        nodeViews: this.extensionManager.nodeViews,
      });
    }
  }

  setEditable(editable: boolean, emitUpdate = true) {
    this.options = {
      ...this.options,
      editable,
    };

    if (this.editorView) {
      this.editorView.setProps({
        ...this.options.editorProps,
        editable: () => this.options.editable,
        nodeViews: this.extensionManager.nodeViews,
      });
    }

    if (emitUpdate) {
      this.emit("update", { editor: this, transaction: this.state.tr });
    }
  }

  setContent(content: Content, options?: SetContentOptions | boolean) {
    const normalizedOptions =
      typeof options === "boolean"
        ? { emitUpdate: options }
        : (options ?? {});
    const nextState = EditorState.create({
      schema: this.schema,
      doc: this.createDocument(
        content ?? null,
        normalizedOptions.parseOptions,
      ),
      plugins: this.allPlugins,
    });

    this.editorState = nextState;
    this.editorView?.updateState(nextState);

    if (normalizedOptions.emitUpdate !== false) {
      this.extensionManager.onUpdate(nextState.tr);
      this.emit("update", { editor: this, transaction: nextState.tr });
      this.emit("selectionUpdate", { editor: this, transaction: nextState.tr });
      this.options.onUpdate({ editor: this, transaction: nextState.tr });
    }
  }

  getJSON() {
    return this.state.doc.toJSON();
  }

  getText(options: EditorGetTextOptions = {}) {
    return this.state.doc.textBetween(
      0,
      this.state.doc.content.size,
      options.blockSeparator ?? "\n\n",
      (leafNode) =>
        options.textSerializers?.[leafNode.type.name]?.(leafNode)
          ?? (leafNode.type.name === "hardBreak" ? "\n" : ""),
    );
  }

  getHTML() {
    if (typeof document === "undefined") {
      return "";
    }

    const serializer = DOMSerializer.fromSchema(this.schema);
    const fragment = serializer.serializeFragment(this.state.doc.content);
    const element = document.createElement("div");

    element.appendChild(fragment);

    return element.innerHTML;
  }

  getAttributes(name: string) {
    const markType = this.schema.marks[name];

    if (markType) {
      const activeMark = getMarkAtCursor(this.state, name);

      if (activeMark) {
        return activeMark.attrs;
      }

      let attrs: Record<string, any> = {};

      this.state.doc.nodesBetween(
        this.state.selection.from,
        this.state.selection.to,
        (node: PMNode) => {
          const mark = markType.isInSet(node.marks);

          if (!mark) {
            return true;
          }

          attrs = mark.attrs;
          return false;
        },
      );

      return attrs;
    }

    const nodeType = this.schema.nodes[name];

    if (!nodeType) {
      return {};
    }

    if (
      this.state.selection instanceof NodeSelection
      && this.state.selection.node.type === nodeType
    ) {
      return this.state.selection.node.attrs;
    }

    for (let depth = this.state.selection.$from.depth; depth >= 0; depth -= 1) {
      const node = this.state.selection.$from.node(depth);

      if (node.type === nodeType) {
        return node.attrs;
      }
    }

    return {};
  }

  isActive(
    nameOrAttributes: string | Record<string, any>,
    attributes: Record<string, any> = {},
  ) {
    if (typeof nameOrAttributes !== "string") {
      const activeAttributes = [
        ...this.state.selection.$from.marks().map((mark) => mark.attrs),
        ...Array.from(
          { length: this.state.selection.$from.depth + 1 },
          (_, index) =>
            this.state.selection.$from.node(this.state.selection.$from.depth - index).attrs,
        ),
      ];

      return activeAttributes.some((item) =>
        matchesAttributes(item, nameOrAttributes),
      );
    }

    const name = nameOrAttributes;
    const markType = this.schema.marks[name];

    if (markType) {
      const { empty, from, to } = this.state.selection;

      if (empty) {
        const mark = getMarkAtCursor(this.state, name);

        return Boolean(mark && matchesAttributes(mark.attrs, attributes));
      }

      let active = false;

      this.state.doc.nodesBetween(from, to, (node: PMNode) => {
        const mark = markType.isInSet(node.marks);

        if (mark && matchesAttributes(mark.attrs, attributes)) {
          active = true;
        }

        return !active;
      });

      return active;
    }

    const nodeType = this.schema.nodes[name];

    if (nodeType) {
      if (
        this.state.selection instanceof NodeSelection
        && this.state.selection.node.type === nodeType
      ) {
        return matchesAttributes(this.state.selection.node.attrs, attributes);
      }

      for (let depth = this.state.selection.$from.depth; depth >= 0; depth -= 1) {
        const node = this.state.selection.$from.node(depth);

        if (node.type === nodeType) {
          return matchesAttributes(node.attrs, attributes);
        }
      }
    }

    return false;
  }

  registerPlugin(
    plugin: Plugin,
    handlePlugins?: (plugin: Plugin, plugins: Plugin[]) => Plugin[],
  ) {
    this.customPlugins = handlePlugins
      ? handlePlugins(plugin, [...this.customPlugins])
      : [...this.customPlugins, plugin];
    this.reconfigureState();
  }

  unregisterPlugin(pluginKey: PluginKeySource) {
    const key = getPluginKeyValue(pluginKey);

    if (!key) {
      return;
    }

    this.customPlugins = this.customPlugins.filter(
      (plugin) => getPluginKeyValue(plugin) !== key,
    );
    this.reconfigureState();
  }

  focus(position?: FocusPosition, options?: FocusOptions) {
    const selection = resolveFocusSelection(this, position);

    if (this.editorView) {
      const transaction = this.editorView.state.tr;

      if (selection && !selection.eq(this.editorView.state.selection)) {
        transaction.setSelection(selection);
      }

      if (options?.scrollIntoView !== false) {
        transaction.scrollIntoView();
      }

      if (transaction.docChanged || transaction.selectionSet || transaction.scrolledIntoView) {
        this.editorView.dispatch(transaction);
      }

      this.editorView.focus();
      return;
    }

    if (!selection.eq(this.editorState.selection)) {
      this.editorState = this.editorState.apply(
        this.editorState.tr.setSelection(selection),
      );
    }
  }

  blur() {
    this.editorView?.dom.blur();
  }

  private get allPlugins() {
    return [
      ...this.extensionManager.plugins,
      ...this.customPlugins,
    ];
  }

  private createState(content: EditorOptions["content"]) {
    return EditorState.create({
      schema: this.schema,
      doc: this.createDocument(content),
      plugins: this.allPlugins,
    });
  }

  private createDocument(
    content: EditorOptions["content"],
    parseOptions?: ParseOptions,
  ): ProseMirrorNode {
    return createDocumentFromContent(
      this.schema,
      content ?? null,
      parseOptions ?? this.options.parseOptions,
    );
  }

  private reconfigureState() {
    const nextState = this.state.reconfigure({
      plugins: this.allPlugins,
    });

    this.editorState = nextState;
    this.editorView?.updateState(nextState);
  }

  private dispatchTransaction = (transaction: Transaction) => {
    if (!this.editorView) {
      return;
    }

    const previousSelection = this.editorView.state.selection;
    const { state } = this.editorView.state.applyTransaction(transaction);

    this.editorState = state;
    this.editorView.updateState(state);
    if (transaction.getMeta("preventUpdate") !== true) {
      this.extensionManager.onUpdate(transaction);
      this.emit("update", { editor: this, transaction });
      if (transaction.selectionSet || !state.selection.eq(previousSelection)) {
        this.emit("selectionUpdate", { editor: this, transaction });
      }
      this.options.onUpdate({ editor: this, transaction });
    }
  };
}
