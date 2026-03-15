import { Extension } from "@mxm-editor/core";
import {
  Decoration,
  DecorationSet,
  Plugin,
  PluginKey,
  type Node as ProseMirrorNode,
} from "@mxm-editor/pm";

export interface InvisibleCharacterSpec {
  type: string;
  predicate: (value: string) => boolean;
  symbol?: string;
}

export interface InvisibleNodeSpec {
  type: string;
  predicate: (node: ProseMirrorNode) => boolean;
  symbol?: string;
}

interface InvisibleCharactersPluginState {
  visible: boolean;
}

interface InvisibleCharactersStyleStorage {
  styleElement: HTMLStyleElement | null;
}

export interface InvisibleCharactersStorage
  extends InvisibleCharactersStyleStorage {
  visibility: () => boolean;
}

export type InvisibleBuilder = InvisibleCharacter | InvisibleNode;

export interface InvisibleCharactersOptions {
  visible: boolean;
  builders: InvisibleBuilder[];
  injectCSS: boolean;
  injectNonce?: string;
}

const invisibleCharactersPluginKey = new PluginKey<InvisibleCharactersPluginState>(
  "invisibleCharacters",
);

const baseClassName = "Tiptap-invisible-character";

function createClassName(type: string) {
  return `${baseClassName} ${baseClassName}--${type}`;
}

function createInjectedStyles() {
  return [
    `.${baseClassName} {`,
    "  position: relative;",
    "}",
    `.${baseClassName}--space {`,
    "  color: transparent;",
    "}",
    `.${baseClassName}--space::before {`,
    "  content: attr(data-character);",
    "  position: absolute;",
    "  inset: 0;",
    "  color: rgba(120, 120, 120, 0.8);",
    "  pointer-events: none;",
    "}",
    `.${baseClassName}--hard-break,`,
    `.${baseClassName}--paragraph {`,
    "  color: rgba(120, 120, 120, 0.8);",
    "  font-size: 0.9em;",
    "  pointer-events: none;",
    "  user-select: none;",
    "}",
  ].join("\n");
}

function ensureStyleElement(
  injectNonce: string | undefined,
  storage: InvisibleCharactersStyleStorage,
) {
  if (typeof document === "undefined" || storage.styleElement) {
    return;
  }

  const style = document.createElement("style");

  style.dataset.mxmInvisibleCharacters = "true";
  style.textContent = createInjectedStyles();

  if (injectNonce) {
    style.nonce = injectNonce;
  }

  document.head.appendChild(style);
  storage.styleElement = style;
}

function destroyStyleElement(storage: InvisibleCharactersStyleStorage) {
  storage.styleElement?.remove();
  storage.styleElement = null;
}

export class InvisibleCharacter {
  readonly type: string;

  readonly symbol: string;

  private readonly predicate: InvisibleCharacterSpec["predicate"];

  constructor(options: InvisibleCharacterSpec) {
    this.type = options.type;
    this.predicate = options.predicate;
    this.symbol = options.symbol ?? "";
  }

  createDecorations(doc: ProseMirrorNode) {
    const decorations: Decoration[] = [];

    doc.descendants((node, pos) => {
      if (!node.isText || !node.text) {
        return true;
      }

      Array.from(node.text).forEach((character, index) => {
        if (!this.predicate(character)) {
          return;
        }

        decorations.push(
          Decoration.inline(
            pos + index,
            pos + index + character.length,
            {
              class: createClassName(this.type),
              "data-character": this.symbol || character,
            },
          ),
        );
      });

      return true;
    });

    return decorations;
  }
}

export class InvisibleNode {
  readonly type: string;

  readonly symbol: string;

  private readonly predicate: InvisibleNodeSpec["predicate"];

  constructor(options: InvisibleNodeSpec) {
    this.type = options.type;
    this.predicate = options.predicate;
    this.symbol = options.symbol ?? "";
  }

  protected getWidgetPosition(node: ProseMirrorNode, pos: number) {
    return pos + node.nodeSize;
  }

  createDecorations(doc: ProseMirrorNode) {
    const decorations: Decoration[] = [];

    doc.descendants((node, pos) => {
      if (!this.predicate(node)) {
        return true;
      }

      const symbol = this.symbol;

      decorations.push(
        Decoration.widget(
          this.getWidgetPosition(node, pos),
          () => {
            const span = document.createElement("span");

            span.className = createClassName(this.type);
            span.dataset.character = symbol;
            span.textContent = symbol;
            span.contentEditable = "false";

            return span;
          },
          {
            side: 1,
          },
        ),
      );

      return true;
    });

    return decorations;
  }
}

export class SpaceCharacter extends InvisibleCharacter {
  constructor() {
    super({
      type: "space",
      predicate: (value) => value === " ",
      symbol: "·",
    });
  }
}

export class HardBreakNode extends InvisibleNode {
  constructor() {
    super({
      type: "hard-break",
      predicate: (node) => node.type.name === "hardBreak",
      symbol: "¬",
    });
  }
}

export class ParagraphNode extends InvisibleNode {
  constructor() {
    super({
      type: "paragraph",
      predicate: (node) => node.type.name === "paragraph",
      symbol: "¶",
    });
  }

  protected override getWidgetPosition(node: ProseMirrorNode, pos: number) {
    return pos + node.nodeSize - 1;
  }
}

function collectDecorations(
  doc: ProseMirrorNode,
  builders: InvisibleBuilder[],
) {
  return builders.flatMap((builder) => builder.createDecorations(doc));
}

export const InvisibleCharacters = Extension.create<
  InvisibleCharactersOptions,
  InvisibleCharactersStorage
>({
  name: "invisibleCharacters",

  addOptions() {
    return {
      visible: true,
      builders: [
        new SpaceCharacter(),
        new HardBreakNode(),
        new ParagraphNode(),
      ],
      injectCSS: true,
      injectNonce: undefined,
    };
  },

  addStorage() {
    return {
      styleElement: null,
      visibility: () => this.options.visible,
    };
  },

  onCreate() {
    this.storage.visibility = () =>
      invisibleCharactersPluginKey.getState(this.editor.state)?.visible
      ?? this.options.visible;

    if (this.options.injectCSS) {
      ensureStyleElement(this.options.injectNonce, this.storage);
    }
  },

  onDestroy() {
    destroyStyleElement(this.storage);
  },

  addCommands() {
    return {
      showInvisibleCharacters:
        (visible = true) =>
        ({ state, dispatch }) => {
          if (!dispatch) {
            return true;
          }

          dispatch(
            state.tr.setMeta(invisibleCharactersPluginKey, {
              visible,
            } satisfies InvisibleCharactersPluginState),
          );

          return true;
        },
      hideInvisibleCharacters:
        () =>
        ({ commands }) =>
          commands.showInvisibleCharacters(false),
      toggleInvisibleCharacters:
        () =>
        ({ commands }) =>
          commands.showInvisibleCharacters(!this.storage.visibility()),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<InvisibleCharactersPluginState>({
        key: invisibleCharactersPluginKey,
        state: {
          init: () => ({
            visible: this.options.visible,
          }),
          apply: (transaction, value) => {
            const meta = transaction.getMeta(invisibleCharactersPluginKey) as
              | InvisibleCharactersPluginState
              | undefined;

            return meta ?? value;
          },
        },
        props: {
          decorations: (state) => {
            const pluginState = invisibleCharactersPluginKey.getState(state);

            if (!pluginState?.visible) {
              return null;
            }

            const decorations = collectDecorations(
              state.doc,
              this.options.builders,
            );

            return decorations.length
              ? DecorationSet.create(state.doc, decorations)
              : null;
          },
        },
      }),
    ];
  },
});
