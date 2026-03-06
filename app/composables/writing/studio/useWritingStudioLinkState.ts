import { getMarkRange } from "@tiptap/core";
import type { Editor } from "@tiptap/vue-3";

export type WritingStudioActiveLinkState = {
  from: number;
  to: number;
  href: string;
  text: string;
};

export type WritingStudioLinkDraftState = WritingStudioActiveLinkState & {
  canRemove: boolean;
};

export const getWritingStudioActiveLinkState = (editor: Editor | null | undefined) => {
  if (!editor || !editor.isActive("link")) {
    return null;
  }

  const href = editor.getAttributes("link").href as string | undefined;
  const linkType = editor.state.schema.marks.link;

  if (!href || !linkType) {
    return null;
  }

  const range = getMarkRange(editor.state.selection.$from, linkType, { href });
  if (!range) {
    return null;
  }

  const text = editor.state.doc.textBetween(range.from, range.to, " ").trim();

  return {
    from: range.from,
    to: range.to,
    href,
    text: text || href,
  } satisfies WritingStudioActiveLinkState;
};

export const getWritingStudioLinkDraftState = (editor: Editor | null | undefined) => {
  if (!editor) {
    return null;
  }

  const activeLink = getWritingStudioActiveLinkState(editor);
  if (activeLink) {
    return {
      ...activeLink,
      canRemove: true,
    } satisfies WritingStudioLinkDraftState;
  }

  const { from, to, empty } = editor.state.selection;
  const text = empty ? "" : editor.state.doc.textBetween(from, to, " ").trim();

  return {
    from,
    to,
    href: "https://",
    text,
    canRemove: false,
  } satisfies WritingStudioLinkDraftState;
};

type WritingStudioLinkRange = Pick<WritingStudioActiveLinkState, "from" | "to">;

type ApplyWritingStudioLinkStateInput = {
  href: string;
  text?: string;
};

const resolveWritingStudioLinkRange = (
  editor: Editor,
  range?: WritingStudioLinkRange | null,
) => {
  if (range) {
    return range;
  }

  const activeLink = getWritingStudioActiveLinkState(editor);
  if (activeLink) {
    return {
      from: activeLink.from,
      to: activeLink.to,
    } satisfies WritingStudioLinkRange;
  }

  const { from, to } = editor.state.selection;
  return {
    from,
    to,
  } satisfies WritingStudioLinkRange;
};

export const applyWritingStudioLinkState = (
  editor: Editor | null | undefined,
  input: ApplyWritingStudioLinkStateInput,
  range?: WritingStudioLinkRange | null,
) => {
  if (!editor) {
    return false;
  }

  const linkMarkType = editor.state.schema.marks.link;
  if (!linkMarkType) {
    return false;
  }

  const targetRange = resolveWritingStudioLinkRange(editor, range);
  const normalizedHref = input.href.trim();
  const normalizedText = input.text?.trim() ?? "";
  const existingText = targetRange.to > targetRange.from
    ? editor.state.doc.textBetween(targetRange.from, targetRange.to, " ")
    : "";
  const nextText = normalizedText || existingText.trim() || normalizedHref;

  editor.commands.focus();

  let tr = editor.state.tr;
  let from = targetRange.from;
  let to = targetRange.to;

  const $from = editor.state.doc.resolve(from);
  const $to = editor.state.doc.resolve(to);
  const preservedMarks = (from === to ? $from.marks() : ($from.marksAcross($to) ?? $from.marks()))
    .filter(mark => mark.type !== linkMarkType);

  if (from === to) {
    if (!normalizedHref && !nextText) {
      return false;
    }

    tr = tr.insertText(nextText, from, to);
    to = from + nextText.length;
  } else {
    tr = tr.removeMark(from, to, linkMarkType);

    if (nextText && nextText !== existingText) {
      tr = tr.insertText(nextText, from, to);
      to = from + nextText.length;

      preservedMarks.forEach((mark) => {
        tr = tr.addMark(from, to, mark);
      });
    }
  }

  if (normalizedHref) {
    tr = tr.addMark(from, to, linkMarkType.create({ href: normalizedHref }));
  }

  editor.view.dispatch(tr.scrollIntoView());
  return true;
};

export const applyWritingStudioLinkHref = (
  editor: Editor | null | undefined,
  href: string,
  range?: WritingStudioLinkRange | null,
) => {
  return applyWritingStudioLinkState(editor, { href }, range);
};
