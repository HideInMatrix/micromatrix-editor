import {
  Selection,
  type Fragment,
} from "@mxm-editor/pm";
import {
  createDocumentFromContent,
  createSliceFromContent,
  isInvalidContentError,
} from "../helpers/content";
import { selectionToInsertionEnd } from "../helpers";
import type {
  Content,
  Range,
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

function getPlainTextContent(fragment: Fragment) {
  let text = "";
  let isPlainText = fragment.childCount > 0;

  fragment.forEach((node) => {
    if (!node.isText || node.marks.length > 0) {
      isPlainText = false;
      return;
    }

    text += node.text ?? "";
  });

  return isPlainText ? text : null;
}

function isOnlyBlockContent(fragment: Fragment) {
  if (fragment.childCount === 0) {
    return false;
  }

  let onlyBlockContent = true;

  fragment.forEach((node) => {
    if (!node.isBlock) {
      onlyBlockContent = false;
    }
  });

  return onlyBlockContent;
}

type ContentCommands = Pick<
  RawCommands,
  "setContent" | "clearContent" | "insertContent" | "insertContentAt" | "cut"
>;

export function createContentCommands(editor: Editor): ContentCommands {
  return {
    setContent:
      (content: Content, options?: SetContentOptions | boolean) =>
      ({ tr }) => {
        const normalizedOptions = normalizeSetContentOptions(options);
        let document;

        try {
          document = createDocumentFromContent(
            editor.schema,
            content,
            {
              parseOptions: normalizedOptions.parseOptions ?? editor.options.parseOptions,
              contentType: normalizedOptions.contentType,
              markdown: editor.markdown,
              errorOnInvalidContent:
                normalizedOptions.errorOnInvalidContent ?? editor.options.enableContentCheck,
            },
          );
        } catch (error) {
          if (!isInvalidContentError(error)) {
            throw error;
          }

          editor.emitContentError(error);
          document = createDocumentFromContent(
            editor.schema,
            content,
            {
              parseOptions: normalizedOptions.parseOptions ?? editor.options.parseOptions,
              contentType: normalizedOptions.contentType,
              markdown: editor.markdown,
              errorOnInvalidContent: false,
            },
          );
        }

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
        let from = clamp(normalizedRange.from, 0, tr.doc.content.size);
        let to = clamp(normalizedRange.to, from, tr.doc.content.size);
        const slice = createSliceFromContent(
          editor.schema,
          value,
          {
            parseOptions: normalizedOptions.parseOptions ?? editor.options.parseOptions,
            contentType: normalizedOptions.contentType,
            markdown: editor.markdown,
          },
        );
        const startLength = tr.steps.length;
        const plainTextContent = getPlainTextContent(slice.content);

        if (from === to && isOnlyBlockContent(slice.content)) {
          const { parent } = tr.doc.resolve(from);
          const isEmptyTextBlock = parent.isTextblock
            && !parent.type.spec.code
            && parent.childCount === 0;

          if (isEmptyTextBlock) {
            from = Math.max(0, from - 1);
            to = Math.min(tr.doc.content.size, to + 1);
          }
        }

        if (plainTextContent !== null) {
          tr.insertText(plainTextContent, from, to);
        } else {
          tr.replaceRange(from, to, slice);
        }

        if (normalizedOptions.updateSelection) {
          selectionToInsertionEnd(tr, startLength, -1);
        }

        return true;
      },
    cut:
      (range: Range, targetPos: number) =>
      ({ tr }) => {
        const from = clamp(range.from, 0, tr.doc.content.size);
        const to = clamp(range.to, from, tr.doc.content.size);
        const contentSlice = tr.doc.slice(from, to);

        tr.deleteRange(from, to);

        const newPosition = clamp(
          tr.mapping.map(targetPos),
          0,
          tr.doc.content.size,
        );

        tr.insert(newPosition, contentSlice.content);
        tr.setSelection(
          Selection.near(
            tr.doc.resolve(clamp(Math.max(newPosition - 1, 0), 0, tr.doc.content.size)),
            1,
          ),
        );

        return true;
      },
  };
}
