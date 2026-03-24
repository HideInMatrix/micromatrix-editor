import {
  NodeSelection,
  Plugin,
  type DirectEditorProps,
  type PluginKey,
  Selection,
  DOMParser as ProseMirrorDOMParser,
  DOMSerializer,
  EditorState,
  EditorView,
  type ParseOptions,
  type Node as PMNode,
  type Node as ProseMirrorNode,
  TextSelection,
  type Transaction,
} from "@mxm-editor/pm";
import { CommandManager } from "./CommandManager";
import { resolveFocusSelection } from "./commands";
import { getCoreExtensions } from "./extensions";
import { EventEmitter } from "./EventEmitter";
import { ExtensionManager } from "./ExtensionManager";
import { createDocumentFromContent } from "./helpers/content";
import {
  getTextBetween,
  getTextSerializersFromSchema,
} from "./helpers";
import type {
  CanCommands,
  ChainedCommands,
  Content,
  EditorGetTextOptions,
  MarkdownParser,
  EditorOptions,
  EditorEventMap,
  FocusOptions,
  FocusPosition,
  PluginKeySource,
  ResolvedEditorOptions,
  SetContentOptions,
  SingleCommands,
  Storage,
} from "./types";
import { style } from "./style";
import {
  clamp,
  createStyleTag,
  matchesAttributes,
} from "./utilities";

function getPluginKeyValue(pluginKey: PluginKeySource) {
  if (typeof pluginKey === "string") {
    return pluginKey;
  }

  const key = (pluginKey as { key?: unknown }).key;

  return typeof key === "string" ? key : null;
}

function matchesPluginKey(plugin: Plugin, pluginKey: PluginKeySource) {
  const pluginValue = getPluginKeyValue(plugin);
  const sourceValue = getPluginKeyValue(pluginKey);

  if (!pluginValue || !sourceValue) {
    return false;
  }

  return pluginValue.startsWith(sourceValue);
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

interface EditorHTMLElement extends HTMLElement {
  editor?: Editor;
}

const optionEventBindings = [
  ["beforeCreate", "onBeforeCreate"],
  ["beforeTransaction", "onBeforeTransaction"],
  ["mount", "onMount"],
  ["unmount", "onUnmount"],
  ["create", "onCreate"],
  ["update", "onUpdate"],
  ["selectionUpdate", "onSelectionUpdate"],
  ["transaction", "onTransaction"],
  ["focus", "onFocus"],
  ["blur", "onBlur"],
  ["paste", "onPaste"],
  ["drop", "onDrop"],
  ["delete", "onDelete"],
  ["destroy", "onDestroy"],
] as const;

export class Editor extends EventEmitter<EditorEventMap> {
  options: ResolvedEditorOptions;

  extensionManager: ExtensionManager;

  markdown: MarkdownParser | null = null;

  private readonly commandManager: CommandManager;

  private editorState: EditorState;

  private editorView: EditorView | null = null;

  private css: HTMLStyleElement | null = null;

  private className = "tiptap";

  private customPlugins: Plugin[] = [];

  private focused = false;

  isInitialized = false;

  isCapturingTransaction = false;

  private capturedTransaction: Transaction | null = null;

  private destroyed = false;

  constructor(options: EditorOptions = {}) {
    super();

    this.options = {
      element: null,
      content: null,
      contentType: undefined,
      injectCSS: true,
      injectNonce: undefined,
      extensions: [],
      autofocus: false,
      editable: true,
      parseOptions: undefined,
      enableInputRules: true,
      enablePasteRules: true,
      coreExtensionOptions: {},
      enableCoreExtensions: true,
      enableExtensionDispatchTransaction: true,
      editorProps: {},
      onBeforeCreate: () => undefined,
      onBeforeTransaction: () => undefined,
      onCreate: () => undefined,
      onMount: () => undefined,
      onUnmount: () => undefined,
      onUpdate: () => undefined,
      onSelectionUpdate: () => undefined,
      onTransaction: () => undefined,
      onFocus: () => undefined,
      onBlur: () => undefined,
      onPaste: () => undefined,
      onDrop: () => undefined,
      onDelete: () => undefined,
      onDestroy: () => undefined,
      ...options,
    };
    this.bindOptionEventListeners();

    this.extensionManager = this.createExtensionManager();
    this.commandManager = new CommandManager({ editor: this });
    this.editorState = this.createState(this.options.content);
    this.emit("beforeCreate", { editor: this });

    if (this.options.element) {
      this.mount(this.options.element);
    }
  }

  get schema() {
    return this.extensionManager.schema;
  }

  get storage(): Storage {
    return this.extensionManager.storage;
  }

  get state() {
    if (this.editorView) {
      this.editorState = this.editorView.state;
    }

    return this.editorState;
  }

  get view() {
    return this.editorView;
  }

  get isEditable() {
    return this.options.editable && (this.editorView ? this.editorView.editable : true);
  }

  get isFocused() {
    return this.focused;
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

  captureTransaction(fn: () => void) {
    this.isCapturingTransaction = true;

    try {
      fn();
    } finally {
      this.isCapturingTransaction = false;
    }

    const transaction = this.capturedTransaction;

    this.capturedTransaction = null;

    return transaction;
  }

  mount(element: HTMLElement) {
    if (typeof document === "undefined") {
      throw new Error(
        "[mxm-editor error]: The editor cannot be mounted because there is no 'document' defined in this environment.",
      );
    }

    if (this.editorView) {
      this.unmount();
    }

    this.options = {
      ...this.options,
      element,
    };
    this.createView(element);

    this.emit("mount", { editor: this });
    this.emit("create", { editor: this });

    this.focus(this.options.autofocus);
    this.isInitialized = true;
  }

  unmount() {
    const dom = this.editorView?.dom as EditorHTMLElement | undefined;

    if (dom) {
      dom.classList.remove(this.className);

      if (dom.editor) {
        delete dom.editor;
      }
    }

    this.editorView?.destroy();
    this.editorView = null;
    this.focused = false;
    this.isInitialized = false;

    if (
      this.css
      && typeof document !== "undefined"
      && !document.querySelectorAll(`.${this.className}`).length
    ) {
      this.css.remove();
    }

    this.css = null;

    this.emit("unmount", { editor: this });
  }

  destroy() {
    this.emit("destroy", { editor: this });
    this.unmount();
    this.removeAllListeners();
    this.destroyed = true;
  }

  setOptions(options: Partial<EditorOptions>) {
    const shouldRebuildExtensions = this.shouldRebuildExtensions(options);
    const contentSnapshots = shouldRebuildExtensions
      ? this.createDocumentSnapshots()
      : [];
    const previousSelection = shouldRebuildExtensions
      ? this.state.selection
      : null;

    this.options = {
      ...this.options,
      ...options,
    };

    if (shouldRebuildExtensions) {
      this.rebuildExtensions(contentSnapshots, previousSelection);
      return;
    }

    this.reconfigureState();

    if (this.editorView) {
      this.editorView.setProps(this.createViewProps(this.editorView.state));
    }
  }

  setEditable(editable: boolean, emitUpdate = true) {
    this.options = {
      ...this.options,
      editable,
    };

    if (this.editorView) {
      this.editorView.setProps(this.createViewProps(this.editorView.state));
    }

    if (emitUpdate) {
      this.emit("update", { editor: this, transaction: this.state.tr, appendedTransactions: [] });
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
        normalizedOptions.contentType,
      ),
      plugins: this.allPlugins,
    });

    this.editorState = nextState;
    this.editorView?.updateState(nextState);

    if (normalizedOptions.emitUpdate !== false) {
      this.emit("update", {
        editor: this,
        transaction: nextState.tr,
        appendedTransactions: [],
      });
      this.emit("selectionUpdate", { editor: this, transaction: nextState.tr });
    }
  }

  getJSON() {
    return this.state.doc.toJSON();
  }

  getText(options: EditorGetTextOptions = {}) {
    const textSerializers = Object.fromEntries(
      Object.entries(options.textSerializers ?? {}).map(([name, serializer]) => [
        name,
        (props: Parameters<NonNullable<typeof serializer>>[0] extends never ? never : any) => (
          serializer.length <= 1
            ? (serializer as (node: ProseMirrorNode) => string)(props.node)
            : serializer(props)
        ),
      ]),
    );

    return getTextBetween(this.state.doc, {
      from: 0,
      to: this.state.doc.content.size,
    }, {
      blockSeparator: options.blockSeparator,
      textSerializers: {
        ...getTextSerializersFromSchema(this.schema),
        ...textSerializers,
        hardBreak: () => "\n",
      },
    });
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

  getMarkdown() {
    if (!this.markdown) {
      throw new Error("Markdown support requires the Markdown extension.");
    }

    return this.markdown.serialize(this.state.doc);
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
    const plugins = handlePlugins
      ? handlePlugins(plugin, [...this.state.plugins])
      : [...this.state.plugins, plugin];

    this.customPlugins = this.getCustomPluginsFromState(plugins, plugin);

    return this.updatePluginState(plugins);
  }

  unregisterPlugin(pluginKey: PluginKeySource | PluginKeySource[]) {
    const pluginKeys = ([] as PluginKeySource[]).concat(pluginKey);
    const plugins = this.state.plugins.filter(
      (plugin) => !pluginKeys.some((item) => matchesPluginKey(plugin, item)),
    );

    if (plugins.length === this.state.plugins.length) {
      return undefined;
    }

    this.customPlugins = this.getCustomPluginsFromState(plugins);

    return this.updatePluginState(plugins);
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

  createNodeViews() {
    if (!this.editorView || this.editorView.isDestroyed) {
      return;
    }

    this.editorView.setProps({
      markViews: this.extensionManager.markViews,
      nodeViews: this.extensionManager.nodeViews,
    });
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
      doc: this.createDocument(content, undefined, this.options.contentType),
      plugins: this.allPlugins,
    });
  }

  private createDocument(
    content: EditorOptions["content"],
    parseOptions?: ParseOptions,
    contentType?: EditorOptions["contentType"],
  ): ProseMirrorNode {
    return createDocumentFromContent(
      this.schema,
      content ?? null,
      {
        parseOptions: parseOptions ?? this.options.parseOptions,
        contentType,
        markdown: this.markdown,
      },
    );
  }

  private reconfigureState() {
    const nextState = this.state.reconfigure({
      plugins: this.allPlugins,
    });

    this.editorState = nextState;
    this.editorView?.updateState(nextState);
  }

  private createExtensionManager() {
    return new ExtensionManager(
      [
        ...getCoreExtensions(this.options),
        ...this.options.extensions,
      ],
      this,
    );
  }

  private rebuildExtensions(
    contentSnapshots: Array<{
      content: Content;
      contentType?: EditorOptions["contentType"];
    }>,
    previousSelection: EditorState["selection"] | null,
  ) {
    this.extensionManager.destroy();
    this.extensionManager = this.createExtensionManager();

    const nextDoc = this.createDocumentFromSnapshots(contentSnapshots);
    const nextState = EditorState.create({
      schema: this.schema,
      doc: nextDoc,
      selection: previousSelection
        ? this.resolveSelectionForDocument(nextDoc, previousSelection)
        : undefined,
      plugins: this.allPlugins,
    });

    this.editorState = nextState;

    if (this.editorView) {
      this.editorView.setProps(this.createViewProps(nextState));
      this.editorView.updateState(nextState);
    }
  }

  private createDocumentSnapshots() {
    const snapshots: Array<{
      content: Content;
      contentType?: EditorOptions["contentType"];
    }> = [];

    if (typeof document !== "undefined") {
      snapshots.push({
        content: this.getHTML(),
        contentType: "html",
      });
    }

    snapshots.push({
      content: this.getJSON(),
      contentType: "json",
    });

    snapshots.push({
      content: this.options.content ?? null,
      contentType: this.options.contentType,
    });

    return snapshots;
  }

  private createDocumentFromSnapshots(
    snapshots: Array<{
      content: Content;
      contentType?: EditorOptions["contentType"];
    }>,
  ) {
    let lastError: unknown;

    for (const snapshot of snapshots) {
      try {
        return this.createDocument(
          snapshot.content,
          undefined,
          snapshot.contentType,
        );
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error("Unable to rebuild editor document.");
  }

  private resolveSelectionForDocument(
    doc: ProseMirrorNode,
    selection: EditorState["selection"],
  ) {
    try {
      const from = clamp(selection.from, 0, doc.content.size);
      const to = clamp(selection.to, 0, doc.content.size);

      if (from === to) {
        return Selection.near(doc.resolve(from));
      }

      return TextSelection.create(doc, from, to);
    } catch {
      return Selection.atStart(doc);
    }
  }

  private shouldRebuildExtensions(options: Partial<EditorOptions>) {
    return (
      "extensions" in options
      || "enableCoreExtensions" in options
      || "coreExtensionOptions" in options
    );
  }

  private createViewProps(state: EditorState): DirectEditorProps {
    const editorProps = this.options.editorProps ?? {};
    const attributes = editorProps.attributes;
    const baseDispatch =
      editorProps.dispatchTransaction
      ?? this.dispatchTransaction;
    const dispatchTransaction = this.options.enableExtensionDispatchTransaction !== false
      ? this.extensionManager.dispatchTransaction(baseDispatch)
      : baseDispatch;
    const transformPastedHTML = this.extensionManager.transformPastedHTML(
      editorProps.transformPastedHTML
        ? (html, view) => editorProps.transformPastedHTML!(html, view as any)
        : undefined,
    );

    return {
      ...editorProps,
      attributes: typeof attributes === "function"
        ? (viewState) => ({
          role: "textbox",
          ...(attributes(viewState) ?? {}),
        })
        : {
          role: "textbox",
          ...(attributes ?? {}),
        },
      state,
      dispatchTransaction,
      transformPastedHTML,
      markViews: this.extensionManager.markViews,
      nodeViews: this.extensionManager.nodeViews,
    };
  }

  private dispatchTransaction = (transaction: Transaction) => {
    if (!this.editorView) {
      return;
    }

    if (this.isCapturingTransaction) {
      if (!this.capturedTransaction) {
        this.capturedTransaction = transaction;
        return;
      }

      transaction.steps.forEach((step) => {
        this.capturedTransaction?.step(step);
      });

      return;
    }

    const previousState = this.editorView.state;
    const previousSelection = previousState.selection;
    const { state, transactions } = previousState.applyTransaction(transaction);
    const appendedTransactions = transactions.slice(1);

    this.emit("beforeTransaction", {
      editor: this,
      transaction,
      nextState: state,
    });

    if (!transactions.includes(transaction)) {
      return;
    }

    this.editorState = state;
    this.editorView.updateState(state);

    this.emit("transaction", {
      editor: this,
      transaction,
      appendedTransactions,
    });

    if (transaction.selectionSet || !state.selection.eq(previousSelection)) {
      this.emit("selectionUpdate", { editor: this, transaction });
    }

    const focusTransaction = [...transactions]
      .reverse()
      .find((item) => item.getMeta("focus") || item.getMeta("blur"));
    const focus = focusTransaction?.getMeta("focus") as { event: FocusEvent } | undefined;
    const blur = focusTransaction?.getMeta("blur") as { event: FocusEvent } | undefined;

    if (focus && focusTransaction) {
      this.focused = true;

      this.emit("focus", {
        editor: this,
        event: focus.event,
        transaction: focusTransaction,
      });
    }

    if (blur && focusTransaction) {
      this.focused = false;

      this.emit("blur", {
        editor: this,
        event: blur.event,
        transaction: focusTransaction,
      });
    }

    if (
      transaction.getMeta("preventUpdate") !== true
      && transactions.some((item) => item.docChanged)
      && !previousState.doc.eq(state.doc)
    ) {
      this.emit("update", {
        editor: this,
        transaction,
        appendedTransactions,
      });
    }
  };

  private bindOptionEventListeners() {
    optionEventBindings.forEach(([eventName, optionKey]) => {
      this.on(eventName, (payload) => {
        const handler = this.options[optionKey];

        if (typeof handler === "function") {
          (handler as (value: typeof payload) => void)(payload);
        }
      });
    });
  }

  private prependClass() {
    if (!this.editorView) {
      return;
    }

    const classNames = this.editorView.dom.className
      .split(/\s+/)
      .filter(Boolean);

    if (!classNames.includes(this.className)) {
      this.editorView.dom.className = [this.className, ...classNames].join(" ");
    }
  }

  private injectCSS() {
    if (this.options.injectCSS && typeof document !== "undefined") {
      this.css = createStyleTag(style, this.options.injectNonce);
    }
  }

  private createView(element: HTMLElement) {
    this.editorState = this.editorState.reconfigure({
      plugins: this.allPlugins,
    });

    this.editorView = new EditorView(
      element,
      this.createViewProps(this.editorState),
    );

    this.createNodeViews();
    this.prependClass();
    this.injectCSS();
    (this.editorView.dom as EditorHTMLElement).editor = this;
  }

  private updatePluginState(plugins: Plugin[]) {
    const nextState = this.state.reconfigure({
      plugins,
    });

    this.editorState = nextState;
    this.editorView?.updateState(nextState);

    return nextState;
  }

  private getCustomPluginsFromState(plugins: Plugin[], addedPlugin?: Plugin) {
    const extensionPluginKeys = new Set(
      this.extensionManager.plugins
        .map((plugin) => getPluginKeyValue(plugin))
        .filter((key): key is string => Boolean(key)),
    );
    const currentCustomPlugins = new Set(this.customPlugins);

    return plugins.filter((plugin) => {
      if (plugin === addedPlugin || currentCustomPlugins.has(plugin)) {
        return true;
      }

      const pluginKey = getPluginKeyValue(plugin);

      return !pluginKey || !extensionPluginKeys.has(pluginKey);
    });
  }
}
