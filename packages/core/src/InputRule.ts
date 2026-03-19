import {
  InputRule,
  type MarkType,
  type NodeType,
  type Transaction,
} from "@mxm-editor/pm";
import { callOrReturn } from "./utilities";

function getMarksRange(match: RegExpMatchArray) {
  if (match.length > 1) {
    const fullMatch = match[0];
    const innerMatch = match[match.length - 1] ?? "";
    const start = fullMatch.lastIndexOf(innerMatch);

    if (start >= 0) {
      return {
        text: innerMatch,
        textStartOffset: start,
        textEndOffset: start + innerMatch.length,
      };
    }
  }

  return {
    text: match[0],
    textStartOffset: 0,
    textEndOffset: match[0].length,
  };
}

export function markInputRule({
  find,
  type,
  getAttributes,
  undoable,
}: {
  find: RegExp;
  type: MarkType;
  getAttributes?:
    | Record<string, any>
    | ((match: RegExpMatchArray) => Record<string, any> | false | null)
    | false
    | null;
  undoable?: boolean;
}) {
  return new InputRule(find, (state, match, start, end) => {
    const attributes = callOrReturn(getAttributes ?? {}, match);

    if (attributes === false || attributes === null) {
      return null;
    }

    const { text, textStartOffset, textEndOffset } = getMarksRange(match);
    let transaction: Transaction = state.tr;
    const markStart = start + textStartOffset;
    const markEnd = start + textEndOffset;

    transaction = transaction.delete(markEnd, end);
    transaction = transaction.delete(start, markStart);

    if (!text.length) {
      return transaction;
    }

    transaction = transaction.addMark(
      start,
      start + text.length,
      type.create(attributes),
    );

    return transaction.removeStoredMark(type);
  }, {
    undoable,
  });
}

export function nodeInputRule({
  find,
  type,
  getAttributes,
  undoable,
}: {
  find: RegExp;
  type: NodeType;
  getAttributes?:
    | Record<string, any>
    | ((match: RegExpMatchArray) => Record<string, any> | false | null)
    | false
    | null;
  undoable?: boolean;
}) {
  return new InputRule(find, (state, match, start, end) => {
    const attributes = callOrReturn(getAttributes ?? {}, match);

    if (attributes === false || attributes === null) {
      return null;
    }

    const transaction = state.tr;
    const node = type.create(attributes);

    if (match[1]) {
      const offset = match[0].lastIndexOf(match[1]);
      let matchStart = start + offset;

      if (matchStart > end) {
        matchStart = end;
      } else {
        end = matchStart + match[1].length;
      }

      const lastChar = match[0][match[0].length - 1];

      transaction.insertText(lastChar, start + match[0].length - 1);
      transaction.replaceWith(matchStart, end, node);

      return transaction;
    }

    if (!match[0]) {
      return null;
    }

    const insertionStart = type.isInline ? start : start - 1;

    transaction.insert(insertionStart, node);
    transaction.delete(
      transaction.mapping.map(start),
      transaction.mapping.map(end),
    );

    return transaction;
  }, {
    undoable,
  });
}

export function textInputRule({
  find,
  replace,
  undoable,
}: {
  find: RegExp;
  replace: string;
  undoable?: boolean;
}) {
  return new InputRule(find, (state, match, start, end) => {
    let insert = replace;

    if (match[1]) {
      const offset = match[0].lastIndexOf(match[1]);

      insert += match[0].slice(offset + match[1].length);
      start += offset;

      const cutOff = start - end;

      if (cutOff > 0) {
        insert = match[0].slice(offset - cutOff, offset) + insert;
        start = end;
      }
    }

    return state.tr.insertText(insert, start, end);
  }, {
    undoable,
  });
}
