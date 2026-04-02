import type {
  EditorTextEngine,
  EditorTextEngineInlineRun,
} from "@mxm-editor/core";

type RawTextSegment = {
  font: string;
  text: string;
};

const COLLAPSIBLE_WHITESPACE = /[\t\n\f\r ]+/g;
const UNSUPPORTED_INLINE_TAGS = new Set([
  "AUDIO",
  "BUTTON",
  "CANVAS",
  "IFRAME",
  "IMG",
  "INPUT",
  "MATH",
  "OBJECT",
  "SELECT",
  "SVG",
  "TEXTAREA",
  "VIDEO",
]);

function parseNumericStyle(value: string | null | undefined) {
  const parsed = Number.parseFloat(value ?? "");

  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveLineHeight(style: CSSStyleDeclaration) {
  const explicitLineHeight = parseNumericStyle(style.lineHeight);

  if (explicitLineHeight > 0) {
    return explicitLineHeight;
  }

  const fontSize = parseNumericStyle(style.fontSize);

  if (fontSize > 0) {
    return fontSize * 1.2;
  }

  return 19.2;
}

function buildFontShorthand(style: CSSStyleDeclaration) {
  const shorthand = style.font?.trim();

  if (shorthand) {
    return shorthand;
  }

  const fontSize = style.fontSize?.trim() || "16px";
  const fontFamily = style.fontFamily?.trim() || "sans-serif";
  const parts = [
    style.fontStyle?.trim(),
    style.fontVariant?.trim(),
    style.fontWeight?.trim(),
    fontSize,
    fontFamily,
  ].filter(Boolean);

  return parts.join(" ");
}

function isSupportedInlineElement(
  element: HTMLElement,
  style: CSSStyleDeclaration,
) {
  if (UNSUPPORTED_INLINE_TAGS.has(element.tagName)) {
    return false;
  }

  if (element.contentEditable === "false") {
    return false;
  }

  return style.display === ""
    || style.display === "inline"
    || style.display === "contents";
}

function collectTextSegments(
  node: Node,
  inheritedStyle: CSSStyleDeclaration,
  segments: RawTextSegment[],
): boolean {
  if (node instanceof Text) {
    if (!node.data.length) {
      return true;
    }

    segments.push({
      font: buildFontShorthand(inheritedStyle),
      text: node.data,
    });
    return true;
  }

  if (!(node instanceof HTMLElement)) {
    return true;
  }

  if (node.tagName === "BR") {
    return false;
  }

  const style = window.getComputedStyle(node);

  if (style.display === "none") {
    return true;
  }

  if (!isSupportedInlineElement(node, style)) {
    return false;
  }

  return Array.from(node.childNodes).every((child) =>
    collectTextSegments(child, style, segments)
  );
}

function normalizeSegments(
  segments: RawTextSegment[],
): EditorTextEngineInlineRun[] {
  const runs: EditorTextEngineInlineRun[] = [];
  let pendingWhitespace = false;

  segments.forEach((segment) => {
    const collapsedText = segment.text.replace(COLLAPSIBLE_WHITESPACE, " ");
    const hasLeadingWhitespace = /^\s/.test(collapsedText);
    const hasTrailingWhitespace = /\s$/.test(collapsedText);
    const trimmedText = collapsedText.trim();

    if (!trimmedText.length) {
      pendingWhitespace = pendingWhitespace
        || hasLeadingWhitespace
        || hasTrailingWhitespace;
      return;
    }

    runs.push({
      kind: "text",
      font: segment.font,
      leadingWhitespace: runs.length > 0
        && (pendingWhitespace || hasLeadingWhitespace),
      text: trimmedText,
    });
    pendingWhitespace = hasTrailingWhitespace;
  });

  return runs;
}

function getVerticalInsets(style: CSSStyleDeclaration) {
  return parseNumericStyle(style.paddingTop)
    + parseNumericStyle(style.paddingBottom)
    + parseNumericStyle(style.borderTopWidth)
    + parseNumericStyle(style.borderBottomWidth)
    + parseNumericStyle(style.marginTop)
    + parseNumericStyle(style.marginBottom);
}

function getHorizontalInsets(style: CSSStyleDeclaration) {
  return parseNumericStyle(style.paddingLeft)
    + parseNumericStyle(style.paddingRight)
    + parseNumericStyle(style.borderLeftWidth)
    + parseNumericStyle(style.borderRightWidth);
}

export function measureTextBlockWithTextEngine(options: {
  element: HTMLElement;
  maxWidth: number;
  textEngine: EditorTextEngine;
}) {
  const style = window.getComputedStyle(options.element);
  const segments: RawTextSegment[] = [];
  const isSupported = Array.from(options.element.childNodes).every((child) =>
    collectTextSegments(child, style, segments)
  );

  if (!isSupported) {
    return null;
  }

  const runs = normalizeSegments(segments);
  const lineHeight = resolveLineHeight(style);
  const contentHeight =
    runs.length > 0
      ? options.textEngine.measure({
          lineHeight,
          maxWidth: Math.max(1, options.maxWidth - getHorizontalInsets(style)),
          runs,
        }).height
      : lineHeight;

  return contentHeight + getVerticalInsets(style);
}
