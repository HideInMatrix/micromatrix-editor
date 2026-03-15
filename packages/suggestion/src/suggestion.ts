import type { Editor } from "@mxm-editor/core";
import {
  Decoration,
  DecorationSet,
  Plugin,
  PluginKey,
  type EditorState,
  type EditorView,
} from "@mxm-editor/pm";

export interface SuggestionRange {
  from: number;
  to: number;
}

export interface SuggestionMatch {
  range: SuggestionRange;
  query: string;
  text: string;
}

export interface FindSuggestionMatchOptions {
  char: string;
  allowSpaces: boolean;
  allowToIncludeChar: boolean;
  allowedPrefixes: string[] | null;
  startOfLine: boolean;
  state: EditorState;
}

export interface SuggestionProps<Item = any, Selected = Item> {
  editor: Editor;
  range: SuggestionRange;
  query: string;
  text: string;
  items: Item[];
  command: (item: Selected) => void;
  decorationNode: Element | null;
  clientRect: (() => DOMRect | null) | null;
}

export interface SuggestionKeyDownProps {
  view: EditorView;
  event: KeyboardEvent;
  range: SuggestionRange;
}

export interface SuggestionState {
  active: boolean;
  range: SuggestionRange;
  query: string;
  text: string;
  decorationId: string | null;
}

export interface SuggestionOptions<Item = any, Selected = Item> {
  editor: Editor;
  char?: string;
  pluginKey?: PluginKey<SuggestionState>;
  allowSpaces?: boolean;
  allowToIncludeChar?: boolean;
  allowedPrefixes?: string[] | null;
  startOfLine?: boolean;
  decorationTag?: string;
  decorationClass?: string;
  decorationEmptyClass?: string;
  command?: (props: {
    editor: Editor;
    range: SuggestionRange;
    props: Selected;
  }) => void;
  items?: (props: { query: string; editor: Editor }) => Item[] | Promise<Item[]>;
  render?: () => {
    onStart?: (props: SuggestionProps<Item, Selected>) => void;
    onUpdate?: (props: SuggestionProps<Item, Selected>) => void;
    onExit?: (props: SuggestionProps<Item, Selected>) => void;
    onKeyDown?: (props: SuggestionKeyDownProps) => boolean;
  };
  allow?: (props: {
    editor: Editor;
    state: EditorState;
    range: SuggestionRange;
    isActive: boolean;
  }) => boolean;
  findSuggestionMatch?: (
    props: FindSuggestionMatchOptions,
  ) => SuggestionMatch | null;
}

const emptySuggestionState: SuggestionState = {
  active: false,
  range: { from: 0, to: 0 },
  query: "",
  text: "",
  decorationId: null,
};

function createDecorationId() {
  return Math.floor(Math.random() * 0xffffffff).toString(36);
}

export function findSuggestionMatch({
  char,
  allowSpaces,
  allowToIncludeChar,
  allowedPrefixes,
  startOfLine,
  state,
}: FindSuggestionMatchOptions): SuggestionMatch | null {
  const { selection } = state;

  if (!selection.empty) {
    return null;
  }

  const { $from } = selection;
  const textBefore = $from.parent.textBetween(
    0,
    $from.parentOffset,
    undefined,
    "\ufffc",
  );
  const triggerIndex = textBefore.lastIndexOf(char);

  if (triggerIndex < 0) {
    return null;
  }

  const prefix = textBefore.slice(0, triggerIndex);
  const previousCharacter = prefix.slice(-1);

  if (startOfLine && triggerIndex !== 0) {
    return null;
  }

  if (
    !startOfLine
    && allowedPrefixes
    && triggerIndex > 0
    && !allowedPrefixes.includes(previousCharacter)
  ) {
    return null;
  }

  const query = textBefore.slice(triggerIndex + char.length);

  if (!allowToIncludeChar && query.includes(char)) {
    return null;
  }

  if (!allowSpaces && /\s/.test(query)) {
    return null;
  }

  return {
    range: {
      from: $from.start() + triggerIndex,
      to: selection.from,
    },
    query,
    text: textBefore.slice(triggerIndex),
  };
}

async function resolveItems<Item>(
  getItems: SuggestionOptions<Item, any>["items"],
  editor: Editor,
  query: string,
) {
  try {
    return await Promise.resolve(
      getItems?.({
        query,
        editor,
      }) ?? [],
    );
  } catch {
    return [];
  }
}

export const SuggestionPluginKey = new PluginKey<SuggestionState>(
  "suggestion",
);

export function exitSuggestion(
  view: EditorView,
  pluginKey: PluginKey = SuggestionPluginKey,
) {
  view.dispatch(view.state.tr.setMeta(pluginKey, { exit: true }));
}

export function Suggestion<Item = any, Selected = Item>({
  editor,
  char = "@",
  pluginKey = SuggestionPluginKey,
  allowSpaces = false,
  allowToIncludeChar = false,
  allowedPrefixes = [" "],
  startOfLine = false,
  decorationTag = "span",
  decorationClass = "suggestion",
  decorationEmptyClass = "is-empty",
  command = () => undefined,
  render = () => ({}),
  allow = () => true,
  findSuggestionMatch: matcher = findSuggestionMatch,
  ...options
}: SuggestionOptions<Item, Selected>) {
  const renderer = render();

  return new Plugin<SuggestionState>({
    key: pluginKey,

    state: {
      init: () => emptySuggestionState,
      apply(transaction, previousState, _oldState, nextState) {
        if (transaction.getMeta(pluginKey)?.exit) {
          return emptySuggestionState;
        }

        if (!transaction.docChanged && !transaction.selectionSet) {
          return previousState;
        }

        const match = matcher({
          char,
          allowSpaces,
          allowToIncludeChar,
          allowedPrefixes,
          startOfLine,
          state: nextState,
        });

        if (
          !match
          || !allow({
            editor,
            state: nextState,
            range: match.range,
            isActive: previousState.active,
          })
        ) {
          return emptySuggestionState;
        }

        return {
          active: true,
          range: match.range,
          query: match.query,
          text: match.text,
          decorationId:
            previousState.active && previousState.decorationId
              ? previousState.decorationId
              : createDecorationId(),
        };
      },
    },

    props: {
      decorations(state) {
        const suggestionState = pluginKey.getState(state);

        if (!suggestionState?.active) {
          return null;
        }

        const classes = [decorationClass];

        if (!suggestionState.query.length) {
          classes.push(decorationEmptyClass);
        }

        return DecorationSet.create(state.doc, [
          Decoration.inline(
            suggestionState.range.from,
            suggestionState.range.to,
            {
              nodeName: decorationTag,
              class: classes.join(" "),
              "data-suggestion-id": suggestionState.decorationId ?? "",
            },
          ),
        ]);
      },

      handleKeyDown(view, event) {
        const suggestionState = pluginKey.getState(view.state);

        if (!suggestionState?.active) {
          return false;
        }

        return (
          renderer.onKeyDown?.({
            view,
            event,
            range: suggestionState.range,
          }) ?? false
        );
      },
    },

    view(view) {
      let currentProps: SuggestionProps<Item, Selected> | null = null;
      let requestId = 0;

      const createProps = (
        suggestionState: SuggestionState,
        items: Item[],
      ): SuggestionProps<Item, Selected> => {
        const decorationNode =
          suggestionState.decorationId
            ? view.dom.querySelector(
                `[data-suggestion-id="${suggestionState.decorationId}"]`,
              )
            : null;

        return {
          editor,
          range: suggestionState.range,
          query: suggestionState.query,
          text: suggestionState.text,
          items,
          decorationNode,
          clientRect: () => decorationNode?.getBoundingClientRect() ?? null,
          command: (item) => {
            const nextSuggestionState = pluginKey.getState(view.state);

            if (!nextSuggestionState?.active) {
              return;
            }

            command({
              editor,
              range: nextSuggestionState.range,
              props: item,
            });

            view.focus();
          },
        };
      };

      const exit = () => {
        requestId += 1;

        if (currentProps) {
          renderer.onExit?.(currentProps);
          currentProps = null;
        }
      };

        const update = async (
          lifecycle: "start" | "update",
          suggestionState: SuggestionState,
        ) => {
        const currentRequest = requestId + 1;

        requestId = currentRequest;

          const items = await resolveItems(
            options.items,
            editor,
            suggestionState.query,
          );

        if (requestId !== currentRequest) {
          return;
        }

        currentProps = createProps(suggestionState, items);

        if (lifecycle === "start") {
          renderer.onStart?.(currentProps);
          return;
        }

        renderer.onUpdate?.(currentProps);
      };

      return {
        update(currentView, previousEditorState) {
          const previousSuggestionState = pluginKey.getState(previousEditorState)
            ?? emptySuggestionState;
          const suggestionState = pluginKey.getState(currentView.state)
            ?? emptySuggestionState;
          const started =
            !previousSuggestionState.active && suggestionState.active;
          const stopped =
            previousSuggestionState.active && !suggestionState.active;
          const changed =
            suggestionState.active
            && (
              !previousSuggestionState.active
              || previousSuggestionState.query !== suggestionState.query
              || previousSuggestionState.range.from !== suggestionState.range.from
              || previousSuggestionState.range.to !== suggestionState.range.to
            );

          if (stopped) {
            exit();
          }

          if (started) {
            void update("start", suggestionState);
            return;
          }

          if (changed) {
            void update("update", suggestionState);
          }
        },

        destroy() {
          exit();
        },
      };
    },
  });
}
