import type {
  Decoration,
  DecorationSource,
  DirectEditorProps,
  DOMOutputSpec,
  InputRule as ProseMirrorInputRule,
  Mark as ProseMirrorMark,
  MarkSpec,
  Node as ProseMirrorNode,
  NodeView as ProseMirrorNodeView,
  NodeViewConstructor,
  NodeSpec,
  ParseOptions,
  Plugin,
  PluginKey,
  Transaction,
  EditorState,
  EditorView,
  MarkType,
  NodeType as ProseMirrorNodeType,
} from "@mxm-editor/pm";
import type { Editor } from "./Editor";

export type ExtensionKind = "extension" | "node" | "mark";

export interface JSONMark {
  type: string;
  attrs?: Record<string, any>;
}

export interface JSONContent {
  type?: string;
  attrs?: Record<string, any>;
  content?: JSONContent[];
  marks?: JSONMark[];
  text?: string;
}

export interface ExtensionContext<
  Options = Record<string, never>,
  Storage = Record<string, never>,
> {
  name: string;
  options: Options;
  storage: Storage;
  editor: Editor;
  type: MarkType | ProseMirrorNodeType | null;
  parent?: any;
}

export interface ExtensionAttribute {
  default?: any;
  parseHTML?: (element: HTMLElement) => any;
  renderHTML?: (attributes: Record<string, any>) => Record<string, string>;
}

export interface GlobalAttributes {
  types: string[];
  attributes: Record<string, ExtensionAttribute>;
}

export interface NodeViewRendererProps {
  node: ProseMirrorNode;
  view: EditorView;
  getPos: boolean | (() => number | undefined);
  decorations: readonly Decoration[];
  innerDecorations: DecorationSource;
  editor: Editor;
  extension: AnyExtension;
  HTMLAttributes: Record<string, string>;
  selected: boolean;
  updateAttributes: (attributes: Record<string, any>) => void;
  deleteNode: () => void;
}

export type NodeViewRenderer = (
  props: NodeViewRendererProps,
) => ProseMirrorNodeView;

export interface PasteRuleMatchContext {
  state: EditorState;
  range: { from: number; to: number };
  match: RegExpMatchArray;
  text: string;
  event: ClipboardEvent;
}

export interface PasteRule {
  find: RegExp;
  replace: (
    props: PasteRuleMatchContext,
  ) => ProseMirrorNode | ProseMirrorNode[] | null;
}

export interface ExtensionConfig<
  Options = Record<string, never>,
  Storage = Record<string, never>,
> {
  name: string;
  priority?: number;
  addOptions?: (this: ExtensionContext<Options, Storage>) => Options;
  addStorage?: (this: ExtensionContext<Options, Storage>) => Storage;
  addExtensions?: (this: ExtensionContext<Options, Storage>) => AnyExtension[];
  addCommands?: (this: ExtensionContext<Options, Storage>) => Partial<RawCommands>;
  addGlobalAttributes?: (
    this: ExtensionContext<Options, Storage>,
  ) => GlobalAttributes[];
  addKeyboardShortcuts?: (
    this: ExtensionContext<Options, Storage>,
  ) => Record<string, () => boolean>;
  addInputRules?: (
    this: ExtensionContext<Options, Storage>,
  ) => ProseMirrorInputRule[];
  addPasteRules?: (
    this: ExtensionContext<Options, Storage>,
  ) => PasteRule[];
  addProseMirrorPlugins?: (
    this: ExtensionContext<Options, Storage>,
  ) => Plugin[];
  renderMarkdown?: (
    this: ExtensionContext<Options, Storage>,
    props: {
      node: JSONContent;
      children: string;
      parent?: JSONContent;
    },
  ) => string;
  onBeforeCreate?: (this: ExtensionContext<Options, Storage>) => void;
  onCreate?: (this: ExtensionContext<Options, Storage>) => void;
  onUpdate?: (
    this: ExtensionContext<Options, Storage>,
    props: { transaction: Transaction },
  ) => void;
  onSelectionUpdate?: (
    this: ExtensionContext<Options, Storage>,
    props: { transaction: Transaction },
  ) => void;
  onTransaction?: (
    this: ExtensionContext<Options, Storage>,
    props: { transaction: Transaction },
  ) => void;
  onFocus?: (
    this: ExtensionContext<Options, Storage>,
    props: { event: FocusEvent },
  ) => void;
  onBlur?: (
    this: ExtensionContext<Options, Storage>,
    props: { event: FocusEvent },
  ) => void;
  onExtensionsResolved?: (
    this: ExtensionContext<Options, Storage>,
    props: { extensions: AnyExtension[] },
  ) => void;
  onDestroy?: (this: ExtensionContext<Options, Storage>) => void;
}

export interface NodeConfig<
  Options = Record<string, never>,
  Storage = Record<string, never>,
> extends ExtensionConfig<Options, Storage> {
  topNode?: boolean;
  content?: NodeSpec["content"];
  marks?: NodeSpec["marks"];
  group?:
    | NodeSpec["group"]
    | ((this: ExtensionContext<Options, Storage>) => NodeSpec["group"]);
  inline?:
    | NodeSpec["inline"]
    | ((this: ExtensionContext<Options, Storage>) => NodeSpec["inline"]);
  atom?: NodeSpec["atom"];
  selectable?: NodeSpec["selectable"];
  draggable?: NodeSpec["draggable"];
  code?: NodeSpec["code"];
  defining?: NodeSpec["defining"];
  isolating?: NodeSpec["isolating"];
  extendNodeSchema?: Record<string, any>;
  addAttributes?: (
    this: ExtensionContext<Options, Storage>,
  ) => Record<string, ExtensionAttribute>;
  addNodeView?: (this: ExtensionContext<Options, Storage>) => NodeViewRenderer;
  parseHTML?: (this: ExtensionContext<Options, Storage>) => NodeSpec["parseDOM"];
  renderHTML?: (
    this: ExtensionContext<Options, Storage>,
    props: {
      node: ProseMirrorNode;
      HTMLAttributes: Record<string, string>;
    },
  ) => DOMOutputSpec;
}

export interface MarkConfig<
  Options = Record<string, never>,
  Storage = Record<string, never>,
> extends ExtensionConfig<Options, Storage> {
  keepOnSplit?:
    | boolean
    | ((this: ExtensionContext<Options, Storage>) => boolean);
  inclusive?:
    | MarkSpec["inclusive"]
    | ((this: ExtensionContext<Options, Storage>) => MarkSpec["inclusive"]);
  excludes?: MarkSpec["excludes"];
  group?: MarkSpec["group"];
  code?: MarkSpec["code"];
  addAttributes?: (
    this: ExtensionContext<Options, Storage>,
  ) => Record<string, ExtensionAttribute>;
  parseHTML?: (this: ExtensionContext<Options, Storage>) => MarkSpec["parseDOM"];
  renderHTML?: (
    this: ExtensionContext<Options, Storage>,
    props: {
      mark: ProseMirrorMark;
      HTMLAttributes: Record<string, string>;
    },
  ) => DOMOutputSpec;
}

export interface ExtensionLike<
  Options = Record<string, never>,
  Storage = Record<string, never>,
  Config extends ExtensionConfig<Options, Storage> = ExtensionConfig<
    Options,
    Storage
  >,
> {
  readonly type: ExtensionKind;
  readonly config: Config;
  readonly name: string;
  readonly priority: number;
  readonly options: Options;
  readonly storage: Storage;
  readonly parent: AnyExtension | null;
  configure(options?: Partial<Options>): ExtensionLike<Options, Storage, Config>;
  extend(config?: Partial<Config>): ExtensionLike<Options, Storage, Config>;
  createContext(editor: Editor): ExtensionContext<Options, Storage>;
}

export type AnyExtension = ExtensionLike<any, any, any>;

export interface Storage {
  [key: string]: any;
}

export type Content =
  | string
  | ProseMirrorNode
  | JSONContent
  | JSONContent[]
  | null;

export type ContentType = "json" | "html" | "markdown";

export interface MarkdownParser {
  parse: (markdown: string) => ProseMirrorNode;
  serialize: (content: JSONContent | ProseMirrorNode) => string;
  instance?: unknown;
}

export type FocusPosition =
  | boolean
  | "start"
  | "end"
  | "all"
  | number
  | null;

export interface FocusOptions {
  scrollIntoView?: boolean;
}

export interface EditorGetTextOptions {
  blockSeparator?: string;
  textSerializers?: Record<string, (node: ProseMirrorNode) => string>;
}

export interface SetContentOptions {
  emitUpdate?: boolean;
  parseOptions?: ParseOptions;
  contentType?: ContentType;
}

export interface InsertContentOptions {
  parseOptions?: ParseOptions;
  updateSelection?: boolean;
  contentType?: ContentType;
}

export interface Range {
  from: number;
  to: number;
}

export type InsertContentAtPosition = number | { from: number; to: number };

export type TextSelectionPosition = number | { from: number; to: number };

export type RulesSetting = boolean | string[] | AnyExtension[];

export interface EditorOptions {
  element?: HTMLElement | null;
  content?: Content;
  contentType?: ContentType;
  extensions?: AnyExtension[];
  autofocus?: FocusPosition;
  editable?: boolean;
  parseOptions?: ParseOptions;
  enableInputRules?: RulesSetting;
  enablePasteRules?: RulesSetting;
  editorProps?: Partial<DirectEditorProps>;
  onBeforeCreate?: (props: { editor: Editor }) => void;
  onCreate?: (props: { editor: Editor }) => void;
  onUpdate?: (props: { editor: Editor; transaction: Transaction }) => void;
  onSelectionUpdate?: (props: { editor: Editor; transaction: Transaction }) => void;
  onTransaction?: (props: { editor: Editor; transaction: Transaction }) => void;
  onFocus?: (props: { editor: Editor; event: FocusEvent }) => void;
  onBlur?: (props: { editor: Editor; event: FocusEvent }) => void;
  onDestroy?: (props: { editor: Editor }) => void;
}

export type ResolvedEditorOptions =
  Omit<Required<EditorOptions>, "parseOptions" | "contentType"> & {
    parseOptions?: ParseOptions;
    contentType?: ContentType;
  };

export interface EditorEventMap {
  beforeCreate: { editor: Editor };
  create: { editor: Editor };
  update: { editor: Editor; transaction: Transaction };
  selectionUpdate: { editor: Editor; transaction: Transaction };
  transaction: { editor: Editor; transaction: Transaction };
  focus: { editor: Editor; event: FocusEvent };
  blur: { editor: Editor; event: FocusEvent };
  destroy: { editor: Editor };
}

export type Command = (props: CommandProps) => boolean;

export interface Commands<ReturnType = boolean> {
  core: {
    command: (command: Command) => ReturnType;
    first: (commands: Command[]) => ReturnType;
    forEach: <Item>(
      items: Item[],
      fn: (item: Item, props: CommandProps & { index: number }) => boolean,
    ) => ReturnType;
    enter: () => ReturnType;
    keyboardShortcut: (name: string) => ReturnType;
    setContent: (content: Content, options?: SetContentOptions | boolean) => ReturnType;
    clearContent: (emitUpdate?: boolean) => ReturnType;
    insertContent: (value: Content, options?: InsertContentOptions) => ReturnType;
    insertContentAt: (
      position: InsertContentAtPosition,
      value: Content,
      options?: InsertContentOptions,
    ) => ReturnType;
    cut: (range: Range, targetPos: number) => ReturnType;
    setTextSelection: (position: TextSelectionPosition) => ReturnType;
    setNodeSelection: (position: number) => ReturnType;
    selectAll: () => ReturnType;
    selectParentNode: () => ReturnType;
    deleteSelection: () => ReturnType;
    deleteRange: (range: { from: number; to: number }) => ReturnType;
    createParagraphNear: () => ReturnType;
    scrollIntoView: () => ReturnType;
    joinUp: () => ReturnType;
    joinDown: () => ReturnType;
    joinBackward: () => ReturnType;
    joinForward: () => ReturnType;
    joinTextblockBackward: () => ReturnType;
    joinTextblockForward: () => ReturnType;
    joinItemBackward: () => ReturnType;
    joinItemForward: () => ReturnType;
    selectNodeBackward: () => ReturnType;
    selectNodeForward: () => ReturnType;
    selectTextblockStart: () => ReturnType;
    selectTextblockEnd: () => ReturnType;
    setMeta: (key: PluginKeySource, value: unknown) => ReturnType;
    focus: (position?: FocusPosition, options?: FocusOptions) => ReturnType;
    blur: () => ReturnType;
    newlineInCode: () => ReturnType;
    liftEmptyBlock: () => ReturnType;
    exitCode: () => ReturnType;
    undoInputRule: () => ReturnType;
    setMark: (name: string, attributes?: Record<string, any>) => ReturnType;
    toggleMark: (name: string, attributes?: Record<string, any>) => ReturnType;
    unsetMark: (name: string) => ReturnType;
    unsetAllMarks: () => ReturnType;
    extendMarkRange: (
      nameOrType: string | MarkType,
      attributes?: Record<string, any>,
    ) => ReturnType;
    updateAttributes: (name: string, attributes?: Record<string, any>) => ReturnType;
    resetAttributes: (
      nameOrType: string | ProseMirrorNodeType | MarkType,
      attributes: string | string[],
    ) => ReturnType;
    setTextDirection: (
      direction: "ltr" | "rtl" | "auto",
      position?: number | Range,
    ) => ReturnType;
    unsetTextDirection: (position?: number | Range) => ReturnType;
    deleteCurrentNode: () => ReturnType;
    deleteNode: (nameOrType: string | ProseMirrorNodeType) => ReturnType;
    clearNodes: () => ReturnType;
    wrapInList: (
      nameOrType: string | ProseMirrorNodeType,
      attributes?: Record<string, any>,
    ) => ReturnType;
    toggleList: (
      listTypeOrName: string | ProseMirrorNodeType,
      itemTypeOrName: string | ProseMirrorNodeType,
      keepMarks?: boolean,
      attributes?: Record<string, any>,
    ) => ReturnType;
    liftListItem: (nameOrType: string | ProseMirrorNodeType) => ReturnType;
    sinkListItem: (nameOrType: string | ProseMirrorNodeType) => ReturnType;
    splitListItem: (nameOrType: string | ProseMirrorNodeType) => ReturnType;
    setNode: (name: string, attributes?: Record<string, any>) => ReturnType;
    toggleNode: (
      name: string,
      fallbackName: string,
      attributes?: Record<string, any>,
    ) => ReturnType;
    wrapIn: (name: string, attributes?: Record<string, any>) => ReturnType;
    toggleWrap: (name: string, attributes?: Record<string, any>) => ReturnType;
    lift: (name?: string) => ReturnType;
    splitBlock: () => ReturnType;
  };
}

export type ValuesOf<T> = T[keyof T];

export type KeysWithTypeOf<T, Type> = {
  [Key in keyof T]: T[Key] extends Type ? Key : never;
}[keyof T];

export type UnionToIntersection<U> =
  (U extends any ? (value: U) => void : never) extends (value: infer I) => void
    ? I
    : never;

export type UnionCommands<ReturnType = Command> = UnionToIntersection<
  ValuesOf<Pick<Commands<ReturnType>, KeysWithTypeOf<Commands<ReturnType>, object>>>
>;

type KnownRawCommands = {
  [Key in keyof UnionCommands]: UnionCommands<Command>[Key];
};

type KnownSingleCommands = {
  [Key in keyof UnionCommands]: UnionCommands<boolean>[Key];
};

type KnownChainedCommands = {
  [Key in keyof UnionCommands]: UnionCommands<ChainedCommands>[Key];
};

export type RawCommands = KnownRawCommands & Record<string, (...args: any[]) => Command>;

export type SingleCommands =
  KnownSingleCommands
  & Record<string, (...args: any[]) => boolean>;

export type ChainedCommands =
  KnownChainedCommands
  & Record<string, (...args: any[]) => ChainedCommands>
  & {
    run: () => boolean;
  };

export type CanCommands = SingleCommands & {
  chain: () => ChainedCommands;
};

export interface CommandProps {
  editor: Editor;
  state: EditorState;
  tr: Transaction;
  view: EditorView | null;
  dispatch?: (transaction: Transaction) => void;
  chain: () => ChainedCommands;
  can: () => CanCommands;
  commands: SingleCommands;
}

export type PluginKeySource = string | PluginKey | Plugin;
