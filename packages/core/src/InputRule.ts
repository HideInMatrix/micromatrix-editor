import {
  InputRule,
  type MarkType,
  type Transaction,
} from "@mxm-editor/pm";

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
}: {
  find: RegExp;
  type: MarkType;
  getAttributes?: Record<string, any> | ((match: RegExpMatchArray) => Record<string, any>);
}) {
  return new InputRule(find, (state, match, start, end) => {
    const attributes =
      typeof getAttributes === "function"
        ? getAttributes(match)
        : (getAttributes ?? {});
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
  });
}
