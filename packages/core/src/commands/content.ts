import { Selection } from "@mxm-editor/pm";
import {
  createDocumentFromContent,
  createSliceFromContent,
} from "../helpers/content";
import type {
  Content,
  InsertContentAtPosition,
  InsertContentOptions,
  RawCommands,
  SetContentOptions,
} from "../types";
import { clamp } from "../utilities";
import type { Editor } from "../Editor";

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

type ContentCommands = Pick<
  RawCommands,
  "setContent" | "clearContent" | "insertContent" | "insertContentAt"
>;

export function createContentCommands(editor: Editor): ContentCommands {
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
  };
}
