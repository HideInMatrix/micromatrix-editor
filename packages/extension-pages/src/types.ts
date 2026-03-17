import type { JSONContent } from "@mxm-editor/core";

export interface PagesMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PagesFormat {
  width: number;
  height: number;
  margins: PagesMargins;
}

export interface PagesFormatInput {
  width: number;
  height: number;
  margins?: Partial<PagesMargins>;
}

export interface PagesLayoutMetrics {
  availableContentHeight: number;
  bottomInset: number;
  leftInset: number;
  rightInset: number;
  topInset: number;
}

export type PagesFormatName =
  | "A3"
  | "A4"
  | "A5"
  | "B4"
  | "B5"
  | "Legal"
  | "Letter"
  | "Tabloid";

export type PagesHeaderFooterContent =
  | string
  | JSONContent
  | JSONContent[]
  | null;

export type PagesHeaderFooterRenderer = (context: {
  page: number;
  totalPages: number;
  section: "header" | "footer";
  pageFormat: PagesFormat;
}) => PagesHeaderFooterContent;

export type PagesHeaderFooterValue =
  | PagesHeaderFooterContent
  | PagesHeaderFooterRenderer;

export type PagesHeaderFooterVariant = "default" | "first" | "odd" | "even";

export interface PagesHeaderFooterVariants {
  default?: PagesHeaderFooterValue | null;
  first?: PagesHeaderFooterValue | null;
  odd?: PagesHeaderFooterValue | null;
  even?: PagesHeaderFooterValue | null;
}

export type PagesHeaderFooter =
  | PagesHeaderFooterValue
  | PagesHeaderFooterVariants
  | null;

export interface PagesStorage {
  pageCount: number;
  pageBreakPositions: number[];
  pageFormat: PagesFormat;
  pageGap: number;
  pageBreakBackground: string;
  headerHeight: number;
  footerHeight: number;
  headerTopMargin: number;
  footerBottomMargin: number;
  header: PagesHeaderFooter;
  footer: PagesHeaderFooter;
  differentFirstPage: boolean;
  differentOddEven: boolean;
  injectCSS: boolean;
  styleElement: HTMLStyleElement | null;
  getPageNumber: (pos: number) => number;
  getMetrics: () => PagesLayoutMetrics;
}

export interface PagesOptions {
  pageFormat: PagesFormatName | PagesFormat | PagesFormatInput;
  pageGap: number;
  pageBreakBackground: string;
  headerHeight: number;
  footerHeight: number;
  headerTopMargin: number;
  footerBottomMargin: number;
  header: PagesHeaderFooter;
  footer: PagesHeaderFooter;
  differentFirstPage: boolean;
  differentOddEven: boolean;
  injectCSS: boolean;
  injectNonce?: string;
}

export interface SetPageFormatOptions {
  pageFormat: PagesFormatName | PagesFormat | PagesFormatInput;
}

export interface SetHeaderFooterOptions {
  value: PagesHeaderFooterValue | null;
  variant?: PagesHeaderFooterVariant;
}
