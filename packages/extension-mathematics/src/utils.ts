import type { Editor } from "@mxm-editor/core";
import type { Node as ProseMirrorNode, Transaction } from "@mxm-editor/pm";
import katex, { type KatexOptions } from "katex";

export const mathMigrationRegex = /\$(?!\d+\$)(.+?)\$(?!\d)/g;

function createGlobalRegex(regex: RegExp) {
  const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;

  return new RegExp(regex.source, flags);
}

export function renderKatexIntoElement(
  element: HTMLElement,
  latex: string,
  katexOptions: KatexOptions | undefined,
  errorClass: string,
) {
  try {
    katex.render(latex, element, katexOptions);
    element.classList.remove(errorClass);
  } catch {
    element.textContent = latex;
    element.classList.add(errorClass);
  }
}

export function createMathMigrateTransaction(
  editor: Editor,
  tr: Transaction,
  regex: RegExp = mathMigrationRegex,
) {
  const inlineMath = editor.schema.nodes.inlineMath;

  if (!inlineMath) {
    return tr;
  }

  tr.doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (!node.isText || !node.text || !node.text.includes("$")) {
      return true;
    }

    const matcher = createGlobalRegex(regex);
    let match: RegExpExecArray | null = matcher.exec(node.text);

    while (match) {
      const mathMatch = match[0];
      const start = match.index;
      const end = start + mathMatch.length;
      const from = tr.mapping.map(pos + start);
      const $from = tr.doc.resolve(from);
      const parent = $from.parent;
      const index = $from.index();

      if (parent.canReplaceWith(index, index + 1, inlineMath)) {
        tr.replaceWith(
          tr.mapping.map(pos + start),
          tr.mapping.map(pos + end),
          inlineMath.create({
            latex: mathMatch.slice(1, -1),
          }),
        );
      }

      if (mathMatch.length === 0) {
        matcher.lastIndex += 1;
      }

      match = matcher.exec(node.text);
    }

    return true;
  });

  tr.setMeta("addToHistory", false);

  return tr;
}

export function migrateMathStrings(
  editor: Editor,
  regex: RegExp = mathMigrationRegex,
) {
  const tr = createMathMigrateTransaction(editor, editor.state.tr, regex);

  if (editor.view) {
    editor.view.dispatch(tr);
    return;
  }

  if (tr.docChanged) {
    editor.setContent(tr.doc, {
      emitUpdate: false,
    });
  }
}
