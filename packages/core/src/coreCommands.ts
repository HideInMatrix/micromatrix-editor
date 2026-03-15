import {
  AllSelection,
  NodeSelection,
  Selection,
  TextSelection,
} from "@mxm-editor/pm";
import {
  createDocumentFromContent,
  createSliceFromContent,
} from "./content";
import type {
  Content,
  FocusOptions,
  FocusPosition,
  InsertContentAtPosition,
  InsertContentOptions,
  PluginKeySource,
  RawCommands,
  SetContentOptions,
  TextSelectionPosition,
} from "./types";
import { clamp } from "./utils";
import type { Editor } from "./Editor";

function normalizeSetContentOptions(
  options?: SetContentOptions | boolean,
): SetContentOptions {
  if (typeof options === "boolean") {
    return {
      emitUpdate: options,
    };
  }

  return options ?? {};
}

function normalizeInsertContentOptions(
  options?: InsertContentOptions,
) {
  return {
    parseOptions: options?.parseOptions,
    updateSelection: options?.updateSelection ?? true,
    contentType: options?.contentType,
  };
}

function normalizeRange(range: InsertContentAtPosition) {
  if (typeof range === "number") {
    return {
      from: range,
      to: range,
    };
  }

  return range;
}

function normalizeTextSelection(position: TextSelectionPosition) {
  if (typeof position === "number") {
    return {
      from: position,
      to: position,
    };
  }

  return position;
}

function resolveFocusSelection(
  editor: Editor,
  position: FocusPosition | undefined,
) {
  const doc = editor.state.doc;

  if (
    position === undefined
    || position === null
    || position === false
    || position === true
  ) {
    return editor.state.selection;
  }

  if (position === "all") {
    return new AllSelection(doc);
  }

  if (position === "start") {
    return Selection.atStart(doc);
  }

  if (position === "end") {
    return Selection.atEnd(doc);
  }

  return Selection.near(
    doc.resolve(clamp(position, 0, doc.content.size)),
    1,
  );
}

function createSelectionInTransaction(
  doc: Editor["state"]["doc"],
  position: FocusPosition,
) {
  if (position === "all") {
    return new AllSelection(doc);
  }

  if (position === "start" || position === true) {
    return Selection.atStart(doc);
  }

  if (position === "end") {
    return Selection.atEnd(doc);
  }

  if (typeof position === "number") {
    return Selection.near(
      doc.resolve(clamp(position, 0, doc.content.size)),
      1,
    );
  }

  return null;
}

export function createCoreCommands(editor: Editor): RawCommands {
  return {
    setContent:
      (content: Content, options?: SetContentOptions | boolean) =>
      ({ tr }) => {
        const normalizedOptions = normalizeSetContentOptions(options);
        const document = createDocumentFromContent(
          editor.schema,
          content,
          {
            parseOptions: normalizedOptions.parseOptions ?? editor.options.parseOptions,
            contentType: normalizedOptions.contentType,
            markdown: editor.markdown,
          },
        );

        tr.replaceWith(0, tr.doc.content.size, document.content);
        tr.setSelection(Selection.atStart(tr.doc));

        if (normalizedOptions.emitUpdate === false) {
          tr.setMeta("preventUpdate", true);
        }

        return true;
      },
    clearContent:
      (emitUpdate = true) =>
      ({ commands }) =>
        commands.setContent(null, {
          emitUpdate,
        }),
    insertContent:
      (value: Content, options?: InsertContentOptions) =>
      ({ state, commands }) =>
        commands.insertContentAt(
          {
            from: state.selection.from,
            to: state.selection.to,
          },
          value,
          options,
        ),
    insertContentAt:
      (
        position: InsertContentAtPosition,
        value: Content,
        options?: InsertContentOptions,
      ) =>
      ({ tr }) => {
        const normalizedRange = normalizeRange(position);
        const normalizedOptions = normalizeInsertContentOptions(options);
        const from = clamp(normalizedRange.from, 0, tr.doc.content.size);
        const to = clamp(normalizedRange.to, from, tr.doc.content.size);
        const slice = createSliceFromContent(
          editor.schema,
          value,
          {
            parseOptions: normalizedOptions.parseOptions ?? editor.options.parseOptions,
            contentType: normalizedOptions.contentType,
            markdown: editor.markdown,
          },
        );

        tr.replaceRange(from, to, slice);

        if (normalizedOptions.updateSelection) {
          const selectionPosition = Math.min(
            from + slice.content.size,
            tr.doc.content.size,
          );

          tr.setSelection(
            Selection.near(
              tr.doc.resolve(selectionPosition),
              1,
            ),
          );
        }

        return true;
      },
    setTextSelection:
      (position: TextSelectionPosition) =>
      ({ tr }) => {
        const range = normalizeTextSelection(position);
        const from = clamp(range.from, 0, tr.doc.content.size);
        const to = clamp(range.to, from, tr.doc.content.size);

        tr.setSelection(TextSelection.create(tr.doc, from, to));
        return true;
      },
    setNodeSelection:
      (position: number) =>
      ({ tr }) => {
        const resolvedPosition = clamp(position, 0, tr.doc.content.size);

        try {
          tr.setSelection(NodeSelection.create(tr.doc, resolvedPosition));
          return true;
        } catch {
          return false;
        }
      },
    selectAll:
      () =>
      ({ tr }) => {
        tr.setSelection(new AllSelection(tr.doc));
        return true;
      },
    deleteSelection:
      () =>
      ({ tr }) => {
        tr.deleteSelection();
        return true;
      },
    deleteRange:
      (range: { from: number; to: number }) =>
      ({ tr }) => {
        const from = clamp(range.from, 0, tr.doc.content.size);
        const to = clamp(range.to, from, tr.doc.content.size);

        tr.delete(from, to);
        return true;
      },
    scrollIntoView:
      () =>
      ({ tr }) => {
        tr.scrollIntoView();
        return true;
      },
    setMeta:
      (key: PluginKeySource, value: unknown) =>
      ({ tr }) => {
        tr.setMeta(key, value);
        return true;
      },
    focus:
      (position?: FocusPosition, options?: FocusOptions) =>
      ({ tr, dispatch }) => {
        const selection = createSelectionInTransaction(
          tr.doc,
          position ?? null,
        );

        if (selection) {
          tr.setSelection(selection);
        }

        if (options?.scrollIntoView !== false) {
          tr.scrollIntoView();
        }

        if (dispatch) {
          editor.view?.focus();
        }

        return true;
      },
    blur:
      () =>
      ({ dispatch }) => {
        if (dispatch) {
          editor.view?.dom.blur();
        }

        return true;
      },
  };
}

export { resolveFocusSelection };
