import type { JSONContent } from "@mxm-editor/core";
import type {
  PagesFormat,
  PagesFormatInput,
  PagesFormatName,
  PagesHeaderFooter,
  PagesHeaderFooterVariant,
  PagesHeaderFooterContent,
  PagesHeaderFooterValue,
  PagesHeaderFooterVariants,
  PagesLayoutMetrics,
  PagesMargins,
  PagesOptions,
  PagesStorage,
} from "./types";

const PIXELS_PER_INCH = 96;
const MILLIMETERS_PER_INCH = 25.4;
const DEFAULT_PAGE_MARGINS: PagesMargins = {
  top: 96,
  right: 96,
  bottom: 96,
  left: 96,
};

export function inchToPixels(value: number) {
  return value * PIXELS_PER_INCH;
}

export function mmToPixels(value: number) {
  return value * (PIXELS_PER_INCH / MILLIMETERS_PER_INCH);
}

export function cmToPixels(value: number) {
  return mmToPixels(value * 10);
}

function createPageFormat(width: number, height: number): PagesFormat {
  return {
    width,
    height,
    margins: { ...DEFAULT_PAGE_MARGINS },
  };
}

export const PAGE_FORMATS: Record<PagesFormatName, PagesFormat> = {
  A3: createPageFormat(mmToPixels(297), mmToPixels(420)),
  A4: createPageFormat(mmToPixels(210), mmToPixels(297)),
  A5: createPageFormat(mmToPixels(148), mmToPixels(210)),
  B4: createPageFormat(mmToPixels(250), mmToPixels(353)),
  B5: createPageFormat(mmToPixels(176), mmToPixels(250)),
  Legal: createPageFormat(inchToPixels(8.5), inchToPixels(14)),
  Letter: createPageFormat(inchToPixels(8.5), inchToPixels(11)),
  Tabloid: createPageFormat(inchToPixels(11), inchToPixels(17)),
};

export const defaultPageFormat = PAGE_FORMATS.A4;

function isPagesMargins(value: unknown): value is Partial<PagesMargins> {
  if (!value || typeof value !== "object") {
    return false;
  }

  return ["top", "right", "bottom", "left"].every((key) => {
    const marginValue = (value as Partial<PagesMargins>)[key as keyof PagesMargins];

    return marginValue === undefined
      || (typeof marginValue === "number" && Number.isFinite(marginValue) && marginValue >= 0);
  });
}

function clonePageFormat(pageFormat: PagesFormat): PagesFormat {
  return {
    width: pageFormat.width,
    height: pageFormat.height,
    margins: {
      ...pageFormat.margins,
    },
  };
}

function resolvePageMargins(margins: Partial<PagesMargins> | null | undefined): PagesMargins {
  if (!isPagesMargins(margins)) {
    return {
      ...DEFAULT_PAGE_MARGINS,
    };
  }

  return {
    top: clampPositiveNumber(margins.top ?? DEFAULT_PAGE_MARGINS.top, DEFAULT_PAGE_MARGINS.top),
    right: clampPositiveNumber(
      margins.right ?? DEFAULT_PAGE_MARGINS.right,
      DEFAULT_PAGE_MARGINS.right,
    ),
    bottom: clampPositiveNumber(
      margins.bottom ?? DEFAULT_PAGE_MARGINS.bottom,
      DEFAULT_PAGE_MARGINS.bottom,
    ),
    left: clampPositiveNumber(margins.left ?? DEFAULT_PAGE_MARGINS.left, DEFAULT_PAGE_MARGINS.left),
  };
}

export function isPagesFormat(
  value: unknown,
): value is PagesFormat | PagesFormatInput {
  return Boolean(
    value
      && typeof value === "object"
      && typeof (value as PagesFormat).width === "number"
      && Number.isFinite((value as PagesFormat).width)
      && (value as PagesFormat).width > 0
      && typeof (value as PagesFormat).height === "number"
      && Number.isFinite((value as PagesFormat).height)
      && (value as PagesFormat).height > 0
      && (
        !("margins" in (value as PagesFormatInput))
        || isPagesMargins((value as PagesFormatInput).margins)
      ),
  );
}

export function resolvePageFormat(
  value: PagesFormatName | PagesFormat | PagesFormatInput | null | undefined,
) {
  if (typeof value === "string" && value in PAGE_FORMATS) {
    return clonePageFormat(PAGE_FORMATS[value]);
  }

  if (isPagesFormat(value)) {
    return {
      width: value.width,
      height: value.height,
      margins: resolvePageMargins(value.margins),
    };
  }

  return clonePageFormat(defaultPageFormat);
}

export function clampPositiveNumber(value: number, fallback: number) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function getPagesLayoutMetrics(options: Pick<
  PagesOptions,
  "pageFormat"
>) {
  const pageFormat = resolvePageFormat(options.pageFormat);
  const topInset = pageFormat.margins.top;
  const rightInset = pageFormat.margins.right;
  const bottomInset = pageFormat.margins.bottom;
  const leftInset = pageFormat.margins.left;

  return {
    topInset,
    rightInset,
    bottomInset,
    leftInset,
    availableContentHeight: Math.max(
      pageFormat.height - topInset - bottomInset,
      1,
    ),
  } satisfies PagesLayoutMetrics;
}

export function arePageBreakPositionsEqual(left: number[], right: number[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function escapeHTML(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeHeaderFooterValue(
  value: PagesHeaderFooter,
): PagesHeaderFooter {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "function") {
    return value;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if ("type" in value) {
    return value as JSONContent;
  }

  return { ...value };
}

export function isHeaderFooterVariants(
  value: PagesHeaderFooter,
): value is PagesHeaderFooterVariants {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  if ("type" in value) {
    return false;
  }

  return ["default", "first", "odd", "even"].some((key) => key in value);
}

export function updateHeaderFooterVariant(
  current: PagesHeaderFooter,
  variant: PagesHeaderFooterVariant,
  value: PagesHeaderFooterValue | null,
) {
  if (variant === "default" && !isHeaderFooterVariants(current)) {
    return value;
  }

  const nextValue = isHeaderFooterVariants(current)
    ? { ...current }
    : current !== null && current !== undefined
      ? {
          default: current,
        }
      : {};

  if (value === null) {
    delete nextValue[variant];
  } else {
    nextValue[variant] = value;
  }

  return Object.keys(nextValue).length ? nextValue : null;
}

export function resolveHeaderFooterVariant(
  value: PagesHeaderFooter,
  options: Pick<PagesOptions, "differentFirstPage" | "differentOddEven">,
  page: number,
) {
  if (!isHeaderFooterVariants(value)) {
    return value ?? null;
  }

  if (options.differentFirstPage && page === 1 && value.first !== undefined) {
    return value.first ?? null;
  }

  if (options.differentOddEven) {
    if (page % 2 === 0 && value.even !== undefined) {
      return value.even ?? null;
    }

    if (page % 2 === 1 && value.odd !== undefined) {
      return value.odd ?? null;
    }
  }

  return value.default ?? null;
}

export function setStorageFromOptions(
  storage: PagesStorage,
  options: PagesOptions,
) {
  storage.pageFormat = resolvePageFormat(options.pageFormat);
  storage.pageGap = clampPositiveNumber(options.pageGap, 50);
  storage.pageBreakBackground = options.pageBreakBackground;
  storage.headerHeight = clampPositiveNumber(options.headerHeight, 0);
  storage.footerHeight = clampPositiveNumber(options.footerHeight, 0);
  storage.headerTopMargin = clampPositiveNumber(options.headerTopMargin, 0);
  storage.footerBottomMargin = clampPositiveNumber(options.footerBottomMargin, 0);
  storage.header = normalizeHeaderFooterValue(options.header);
  storage.footer = normalizeHeaderFooterValue(options.footer);
  storage.differentFirstPage = options.differentFirstPage;
  storage.differentOddEven = options.differentOddEven;
  storage.injectCSS = options.injectCSS;
}
