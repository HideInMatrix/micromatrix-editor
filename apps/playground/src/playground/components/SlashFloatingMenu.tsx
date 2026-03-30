import {
  useCallback,
  useRef,
  type MouseEventHandler,
} from "react";
import type { Editor } from "@mxm-editor/core";
import {
  FloatingMenu,
  useEditorState,
} from "@mxm-editor/react";
import type { SuggestionState } from "@mxm-editor/suggestion";
import {
  executeSlashItem,
  filterSlashItems,
  slashPluginKey,
  type SlashItem,
} from "../extensions";

const preventMouseDown: MouseEventHandler<HTMLButtonElement> = (event) => {
  event.preventDefault();
};

const slashFloatingMenuOptions = {
  offset: 12,
  flip: true,
  shift: true,
} as const;

export function useSlashSuggestionState(editor: Editor | null | undefined) {
  return useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const suggestionState = currentEditor
        ? (slashPluginKey.getState(currentEditor.state) as SuggestionState | undefined)
        : undefined;

      return {
        active: suggestionState?.active ?? false,
        query: suggestionState?.query ?? "",
        range: suggestionState?.range ?? {
          from: 0,
          to: 0,
        },
        viewReady: Boolean(currentEditor?.view),
      };
    },
  });
}

export function SlashFloatingMenu({ editor }: { editor: Editor | null }) {
  const slashState = useSlashSuggestionState(editor);
  const slashStateRef = useRef(slashState);

  slashStateRef.current = slashState;

  const shouldShow = useCallback(() => slashStateRef.current.active, []);

  if (!editor || !slashState.viewReady) {
    return null;
  }

  const items = slashState.active
    ? filterSlashItems(slashState.query)
    : ([] as SlashItem[]);

  return (
    <FloatingMenu
      className="floating-menu slash-floating-menu"
      editor={editor}
      options={slashFloatingMenuOptions}
      pluginKey="slashFloatingMenu"
      shouldShow={shouldShow}
    >
      {items.length ? (
        items.map((item, index) => (
          <button
            key={item.id}
            className={`slash-item${index === 0 ? " is-active" : ""}`}
            onMouseDown={preventMouseDown}
            onClick={() => {
              executeSlashItem(editor, slashState.range, item);
            }}
            type="button"
          >
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </button>
        ))
      ) : (
        <div className="slash-empty">没有匹配的命令</div>
      )}
    </FloatingMenu>
  );
}
