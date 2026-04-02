import {
  layoutNextLine,
  prepareWithSegments,
  walkLineRanges,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";
import type {
  EditorTextEngine,
  EditorTextEngineAtomRun,
  EditorTextEngineBreakRun,
  EditorTextEngineLine,
  EditorTextEngineLineFragment,
  EditorTextEngineMeasureOptions,
  EditorTextEngineMeasureResult,
  EditorTextEngineTextRun,
} from "@mxm-editor/core";

export interface PretextTextEngineOptions {
  name?: string;
}

type PreparedTextItem = {
  kind: "text";
  chromeWidth: number;
  endCursor: LayoutCursor;
  fullText: string;
  fullWidth: number;
  leadingGap: number;
  prepared: PreparedTextWithSegments;
};

type AtomItem = {
  kind: "atom";
  leadingGap: number;
  width: number;
};

type BreakItem = {
  kind: "break";
};

type InlineItem = PreparedTextItem | AtomItem | BreakItem;

const LINE_START_CURSOR: LayoutCursor = {
  segmentIndex: 0,
  graphemeIndex: 0,
};
const UNBOUNDED_WIDTH = 100_000;

function measureSingleLineWidth(prepared: PreparedTextWithSegments) {
  let maxWidth = 0;

  walkLineRanges(prepared, UNBOUNDED_WIDTH, (line) => {
    if (line.width > maxWidth) {
      maxWidth = line.width;
    }
  });

  return maxWidth;
}

function cursorsMatch(a: LayoutCursor, b: LayoutCursor) {
  return a.segmentIndex === b.segmentIndex
    && a.graphemeIndex === b.graphemeIndex;
}

function createBlankLine(lineHeight: number): EditorTextEngineLine {
  return {
    fragments: [],
    height: lineHeight,
    width: 0,
  };
}

class PretextTextEngine implements EditorTextEngine {
  readonly name: string;

  private readonly preparedTextCache = new Map<string, PreparedTextWithSegments>();

  private readonly collapsedSpaceWidthCache = new Map<string, number>();

  constructor(options: PretextTextEngineOptions = {}) {
    this.name = options.name ?? "pretext";
  }

  measure(options: EditorTextEngineMeasureOptions): EditorTextEngineMeasureResult {
    const safeWidth = Math.max(1, options.maxWidth);
    const lineHeight = Math.max(1, options.lineHeight);
    const items = this.prepareItems(options);
    const lines: EditorTextEngineLine[] = [];

    let itemIndex = 0;
    let textCursor: LayoutCursor | null = null;

    while (itemIndex < items.length) {
      const fragments: EditorTextEngineLineFragment[] = [];
      let lineWidth = 0;
      let remainingWidth = safeWidth;
      let sawForcedBreak = false;

      lineLoop:
      while (itemIndex < items.length) {
        const item = items[itemIndex]!;

        switch (item.kind) {
          case "break":
            itemIndex += 1;
            textCursor = null;
            sawForcedBreak = true;
            break lineLoop;
          case "atom": {
            const leadingGap = fragments.length === 0 ? 0 : item.leadingGap;

            if (fragments.length > 0 && leadingGap + item.width > remainingWidth) {
              break lineLoop;
            }

            fragments.push({
              kind: "atom",
              leadingGap,
              width: item.width,
            });
            lineWidth += leadingGap + item.width;
            remainingWidth = Math.max(0, safeWidth - lineWidth);
            itemIndex += 1;
            textCursor = null;
            continue;
          }
          case "text": {
            if (textCursor !== null && cursorsMatch(textCursor, item.endCursor)) {
              itemIndex += 1;
              textCursor = null;
              continue;
            }

            const leadingGap = fragments.length === 0 ? 0 : item.leadingGap;
            const reservedWidth = leadingGap + item.chromeWidth;

            if (fragments.length > 0 && reservedWidth >= remainingWidth) {
              break lineLoop;
            }

            if (textCursor === null) {
              const fullWidth = leadingGap + item.fullWidth + item.chromeWidth;

              if (fullWidth <= remainingWidth) {
                fragments.push({
                  kind: "text",
                  leadingGap,
                  text: item.fullText,
                  width: item.fullWidth,
                });
                lineWidth += fullWidth;
                remainingWidth = Math.max(0, safeWidth - lineWidth);
                itemIndex += 1;
                continue;
              }
            }

            const startCursor = textCursor ?? LINE_START_CURSOR;
            const line = layoutNextLine(
              item.prepared,
              startCursor,
              Math.max(1, remainingWidth - reservedWidth),
            );

            if (line === null || cursorsMatch(startCursor, line.end)) {
              itemIndex += 1;
              textCursor = null;
              continue;
            }

            fragments.push({
              kind: "text",
              leadingGap,
              text: line.text,
              width: line.width,
            });
            lineWidth += leadingGap + line.width + item.chromeWidth;
            remainingWidth = Math.max(0, safeWidth - lineWidth);

            if (cursorsMatch(line.end, item.endCursor)) {
              itemIndex += 1;
              textCursor = null;
              continue;
            }

            textCursor = line.end;
            break lineLoop;
          }
        }
      }

      if (fragments.length === 0) {
        if (!sawForcedBreak) {
          break;
        }

        lines.push(createBlankLine(lineHeight));
        continue;
      }

      lines.push({
        fragments,
        height: lineHeight,
        width: lineWidth,
      });
    }

    return {
      height: lines.length * lineHeight,
      lineCount: lines.length,
      lines,
    };
  }

  private prepareItems(options: EditorTextEngineMeasureOptions): InlineItem[] {
    const items: InlineItem[] = [];

    options.runs.forEach((run) => {
      switch (run.kind) {
        case "break":
          items.push(this.prepareBreak(run));
          return;
        case "atom":
          items.push(this.prepareAtom(run));
          return;
        case "text": {
          const prepared = this.prepareText(run);

          if (prepared) {
            items.push(prepared);
          }
          return;
        }
      }
    });

    return items;
  }

  private prepareBreak(_run: EditorTextEngineBreakRun): BreakItem {
    return { kind: "break" };
  }

  private prepareAtom(run: EditorTextEngineAtomRun): AtomItem {
    return {
      kind: "atom",
      leadingGap: Math.max(0, run.leadingGap ?? 0),
      width: Math.max(0, run.width),
    };
  }

  private prepareText(run: EditorTextEngineTextRun): PreparedTextItem | null {
    const trimmedText = run.text.trim();

    if (!trimmedText.length) {
      return null;
    }

    const prepared = this.getPreparedText(trimmedText, run.font);
    const wholeLine = layoutNextLine(prepared, LINE_START_CURSOR, UNBOUNDED_WIDTH);

    if (wholeLine === null) {
      return null;
    }

    return {
      kind: "text",
      chromeWidth: Math.max(0, run.chromeWidth ?? 0),
      endCursor: wholeLine.end,
      fullText: wholeLine.text,
      fullWidth: wholeLine.width,
      leadingGap: this.resolveLeadingGap(run),
      prepared,
    };
  }

  private resolveLeadingGap(run: EditorTextEngineTextRun) {
    const explicitGap = Math.max(0, run.leadingGap ?? 0);

    if (!run.leadingWhitespace) {
      return explicitGap;
    }

    return explicitGap + this.getCollapsedSpaceWidth(run.font);
  }

  private getCollapsedSpaceWidth(font: string) {
    const cached = this.collapsedSpaceWidthCache.get(font);

    if (cached !== undefined) {
      return cached;
    }

    const joinedWidth = measureSingleLineWidth(this.getPreparedText("A A", font));
    const compactWidth = measureSingleLineWidth(this.getPreparedText("AA", font));
    const collapsedWidth = Math.max(0, joinedWidth - compactWidth);

    this.collapsedSpaceWidthCache.set(font, collapsedWidth);

    return collapsedWidth;
  }

  private getPreparedText(text: string, font: string) {
    const cacheKey = `${font}\u0000${text}`;
    const cached = this.preparedTextCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const prepared = prepareWithSegments(text, font);

    this.preparedTextCache.set(cacheKey, prepared);

    return prepared;
  }
}

export function createPretextTextEngine(
  options: PretextTextEngineOptions = {},
): EditorTextEngine {
  return new PretextTextEngine(options);
}
