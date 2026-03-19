import {
  Fragment,
  Mark,
  Plugin,
  Slice,
  type EditorState,
  type MarkType,
  type NodeType,
  type Node as ProseMirrorNode,
} from "@mxm-editor/pm";
import type {
  JSONContent,
  PasteRule,
} from "./types";
import { callOrReturn } from "./utilities";

type Segment =
  | {
      type: "text";
      text: string;
      marks: ReturnType<MarkType["create"]>[];
    }
  | {
      type: "node";
      node: ProseMirrorNode;
    };

function createRegExp(regExp: RegExp) {
  return new RegExp(
    regExp.source,
    regExp.flags.includes("g") ? regExp.flags : `${regExp.flags}g`,
  );
}

function mergeMarks(
  baseMarks: ReturnType<MarkType["create"]>[],
  nextMarks: readonly ReturnType<MarkType["create"]>[],
) {
  return Mark.setFrom([...baseMarks, ...nextMarks]) as ReturnType<
    MarkType["create"]
  >[];
}

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

function normalizeReplacement(
  replacement: ProseMirrorNode | ProseMirrorNode[] | null,
  inheritedMarks: ReturnType<MarkType["create"]>[],
): Segment[] {
  if (!replacement) {
    return [];
  }

  const nodes = Array.isArray(replacement) ? replacement : [replacement];

  return nodes.reduce<Segment[]>((segments, node) => {
    if (node.isText) {
      const text = node.text ?? "";

      if (!text.length) {
        return segments;
      }

      segments.push({
        type: "text",
        text,
        marks: mergeMarks(inheritedMarks, node.marks),
      });

      return segments;
    }

    segments.push({
      type: "node",
      node,
    });

    return segments;
  }, []);
}

function applyRuleToSegment(
  state: EditorState,
  segment: Segment,
  rule: PasteRule,
  event: ClipboardEvent,
) {
  if (segment.type !== "text" || !segment.text.length) {
    return [segment];
  }

  const expression = createRegExp(rule.find);
  const nextSegments: Segment[] = [];
  let lastIndex = 0;
  let match = expression.exec(segment.text);

  while (match) {
    const fullMatch = match[0];

    if (!fullMatch.length) {
      break;
    }

    const matchStart = match.index;
    const matchEnd = matchStart + fullMatch.length;

    if (matchStart > lastIndex) {
      nextSegments.push({
        type: "text",
        text: segment.text.slice(lastIndex, matchStart),
        marks: segment.marks,
      });
    }

    const replacement = rule.replace({
      state,
      range: { from: matchStart, to: matchEnd },
      match,
      text: fullMatch,
      event,
    });

    if (replacement) {
      nextSegments.push(
        ...normalizeReplacement(replacement, segment.marks),
      );
    } else {
      nextSegments.push({
        type: "text",
        text: fullMatch,
        marks: segment.marks,
      });
    }

    lastIndex = matchEnd;
    match = expression.exec(segment.text);
  }

  if (!nextSegments.length) {
    return [segment];
  }

  if (lastIndex < segment.text.length) {
    nextSegments.push({
      type: "text",
      text: segment.text.slice(lastIndex),
      marks: segment.marks,
    });
  }

  return nextSegments;
}

function buildInlineNodes(
  state: EditorState,
  text: string,
  rules: PasteRule[],
  event: ClipboardEvent,
) {
  const segments = rules.reduce<Segment[]>(
    (currentSegments, rule) =>
      currentSegments.flatMap((segment) =>
        applyRuleToSegment(state, segment, rule, event),
      ),
    [
      {
        type: "text" as const,
        text,
        marks: [],
      },
    ],
  );

  const nodes = segments.flatMap((segment) => {
    if (segment.type === "node") {
      return [segment.node];
    }

    if (!segment.text.length) {
      return [];
    }

    return [state.schema.text(segment.text, segment.marks)];
  });

  if (!nodes.length) {
    return null;
  }

  const serialized = nodes.map((node) => node.toJSON());

  if (
    nodes.length === 1
    && nodes[0].isText
    && nodes[0].text === text
    && !nodes[0].marks.length
  ) {
    return null;
  }

  if (
    serialized.length === 1
    && serialized[0].type === "text"
    && serialized[0].text === text
    && !serialized[0].marks?.length
  ) {
    return null;
  }

  return nodes;
}

export function pasteRulesPlugin(rules: PasteRule[]) {
  return new Plugin({
    props: {
      handlePaste(view, event) {
        const text = event.clipboardData?.getData("text/plain");

        if (!text) {
          return false;
        }

        const nodes = buildInlineNodes(view.state, text, rules, event);

        if (!nodes) {
          return false;
        }

        view.dispatch(
          view.state.tr.replaceSelection(
            new Slice(Fragment.fromArray(nodes), 0, 0),
          ),
        );

        return true;
      },
    },
  });
}

export function markPasteRule({
  find,
  type,
  getAttributes,
}: {
  find: RegExp;
  type: MarkType;
  getAttributes?:
    | Record<string, any>
    | ((match: RegExpMatchArray, event: ClipboardEvent) => Record<string, any> | false | null)
    | false
    | null;
}): PasteRule {
  return {
    find,
    replace: ({ state, match, event }) => {
      const attributes = callOrReturn(getAttributes ?? {}, match, event);

      if (attributes === false || attributes === null) {
        return null;
      }

      const { text } = getMarksRange(match);

      return state.schema.text(text, [type.create(attributes)]);
    },
  };
}

function createNodeContent(
  type: NodeType,
  content:
    | JSONContent
    | JSONContent[]
    | ((attributes: Record<string, any>) => JSONContent | JSONContent[] | false | null)
    | false
    | null
    | undefined,
  attributes: Record<string, any>,
) {
  const resolvedContent = callOrReturn(content as any, attributes);

  if (!resolvedContent) {
    return undefined;
  }

  const items = Array.isArray(resolvedContent)
    ? resolvedContent
    : [resolvedContent];

  return Fragment.fromArray(
    items.map((item) => type.schema.nodeFromJSON(item)),
  );
}

export function nodePasteRule({
  find,
  type,
  getAttributes,
  getContent,
}: {
  find: RegExp;
  type: NodeType;
  getAttributes?:
    | Record<string, any>
    | ((match: RegExpMatchArray, event: ClipboardEvent) => Record<string, any> | false | null)
    | false
    | null;
  getContent?:
    | JSONContent
    | JSONContent[]
    | ((attributes: Record<string, any>) => JSONContent | JSONContent[] | false | null)
    | false
    | null;
}): PasteRule {
  return {
    find,
    replace: ({ match, event }) => {
      const attributes = callOrReturn(getAttributes ?? {}, match, event);

      if (attributes === false || attributes === null) {
        return null;
      }

      const content = createNodeContent(type, getContent, attributes);

      return type.create(attributes, content);
    },
  };
}

export function textPasteRule({
  find,
  replace,
}: {
  find: RegExp;
  replace: string;
}): PasteRule {
  return {
    find,
    replace: ({ state, match }) => {
      let insert = replace;

      if (match[1]) {
        const offset = match[0].lastIndexOf(match[1]);
        let start = offset;
        const end = match[0].length;

        insert += match[0].slice(offset + match[1].length);
        const cutOff = start - end;

        if (cutOff > 0) {
          insert = match[0].slice(offset - cutOff, offset) + insert;
          start = end;
        }
      }

      return state.schema.text(insert);
    },
  };
}
