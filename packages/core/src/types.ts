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
  addCommands?: (this: ExtensionContext<Options, Storage>) => RawCommands;
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
  onCreate?: (this: ExtensionContext<Options, Storage>) => void;
  onUpdate?: (
    this: ExtensionContext<Options, Storage>,
    props: { transaction: Transaction },
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
  inclusive?: MarkSpec["inclusive"];
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
  configure(options?: Partial<Options>): ExtensionLike<Options, Storage, Config>;
  createContext(editor: Editor): ExtensionContext<Options, Storage>;
}

export type AnyExtension = ExtensionLike<any, any, any>;

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
  onCreate?: (props: { editor: Editor }) => void;
  onUpdate?: (props: { editor: Editor; transaction: Transaction }) => void;
  onDestroy?: (props: { editor: Editor }) => void;
}

export type ResolvedEditorOptions =
  Omit<Required<EditorOptions>, "parseOptions" | "contentType"> & {
    parseOptions?: ParseOptions;
    contentType?: ContentType;
  };

export interface EditorEventMap {
  create: { editor: Editor };
  update: { editor: Editor; transaction: Transaction };
  selectionUpdate: { editor: Editor; transaction: Transaction };
  destroy: { editor: Editor };
}

export type Command = (props: CommandProps) => boolean;

export type RawCommands = Record<string, (...args: any[]) => Command>;

export type SingleCommands = Record<string, (...args: any[]) => boolean>;

export type ChainedCommands = SingleCommands & {
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
