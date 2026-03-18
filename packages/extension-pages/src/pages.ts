import type { CommandProps, Extensions, JSONContent } from "@mxm-editor/core";
import { Extension } from "@mxm-editor/core";
import {
  Decoration,
  DecorationSet,
  Plugin,
  PluginKey,
  type EditorView,
  type Node as ProseMirrorNode,
} from "@mxm-editor/pm";
import { renderToHTMLString } from "@mxm-editor/static-renderer/pm/html-string";
import type {
  PagesFormat,
  PagesFormatInput,
  PagesHeaderFooterVariant,
  PagesHeaderFooterValue,
  PagesOptions,
  PagesStorage,
  SetHeaderFooterOptions,
  SetPageFormatOptions,
} from "./types";
import {
  arePageBreakPositionsEqual,
  clampPositiveNumber,
  defaultPageFormat,
  escapeHTML,
  getPagesLayoutMetrics,
  isHeaderFooterVariants,
  isPagesFormat,
  PAGE_FORMATS,
  resolveHeaderFooterVariant,
  resolvePageFormat,
  setStorageFromOptions,
  updateHeaderFooterVariant,
} from "./utils";

interface PagesPluginState {
  pageBreakPositions: number[];
  pageCount: number;
  revision: number;
}

type PagesPluginMeta =
  | {
      type: "options";
    }
  | {
      type: "layout";
      pageBreakPositions: number[];
      pageCount: number;
    };

const pagesPluginKey = new PluginKey<PagesPluginState>("pages");
const pagesStyleAttribute = "data-mxm-pages";
const pagesHostClassName = "mxm-pages";
const pagesEditorClassName = "mxm-pages-editor";
const pagesPaginationAttribute = "data-mxm-pagination";

function createInjectedStyles() {
  return [
    `.${pagesHostClassName} {`,
    "  --mxm-pages-width: 794px;",
    "  --mxm-pages-height: 1123px;",
    "  --mxm-pages-min-height: var(--mxm-pages-height);",
    "  --mxm-pages-gap: 50px;",
    "  --mxm-pages-break-background: #e5e7eb;",
    "  --mxm-pages-padding-top: 96px;",
    "  --mxm-pages-padding-left: 96px;",
    "  --mxm-pages-padding-right: 96px;",
    "  --mxm-pages-padding-bottom: 96px;",
    "  --mxm-pages-break-height: 242px;",
    "  --mxm-pages-surface: var(--mxm-pages-page-background, #ffffff);",
    "  position: relative;",
    "  background: var(--mxm-pages-break-background);",
    "}",
    `.${pagesHostClassName} .${pagesEditorClassName} {`,
    "  position: relative;",
    "  width: min(100%, var(--mxm-pages-width));",
    "  min-height: var(--mxm-pages-min-height);",
    "  margin: 0 auto;",
    "  box-sizing: border-box;",
    "  padding-top: 0;",
    "  padding-left: var(--mxm-pages-padding-left);",
    "  padding-right: var(--mxm-pages-padding-right);",
    "  padding-bottom: var(--mxm-pages-padding-bottom);",
    "  background-image: linear-gradient(",
    "    to bottom,",
    "    var(--mxm-pages-surface) 0,",
    "    var(--mxm-pages-surface) var(--mxm-pages-height),",
    "    var(--mxm-pages-break-background) var(--mxm-pages-height),",
    "    var(--mxm-pages-break-background) calc(var(--mxm-pages-height) + var(--mxm-pages-gap))",
    "  );",
    "  background-size: 100% calc(var(--mxm-pages-height) + var(--mxm-pages-gap));",
    "  background-repeat: repeat-y;",
    "  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.06);",
    "}",
    `.${pagesHostClassName} .${pagesEditorClassName} > .ProseMirror-widget:first-child + * {`,
    "  margin-top: 0 !important;",
    "}",
    `.${pagesHostClassName} [${pagesPaginationAttribute}] {`,
    "  display: block;",
    "  position: relative;",
    "  height: 0;",
    "  pointer-events: none;",
    "}",
    `.${pagesHostClassName} .mxm-page-break {`,
    "  display: contents;",
    "}",
    `.${pagesHostClassName} .page {`,
    "  position: relative;",
    "  float: left;",
    "  clear: both;",
    "  width: 1px;",
    "  height: 0;",
    "}",
    `.${pagesHostClassName} .breaker,`,
    `.${pagesHostClassName} .mxm-page-footer--final {`,
    "  width: calc(100% + var(--mxm-pages-padding-left) + var(--mxm-pages-padding-right));",
    "  margin-left: calc(var(--mxm-pages-padding-left) * -1);",
    "  margin-right: calc(var(--mxm-pages-padding-right) * -1);",
    "  pointer-events: none;",
    "}",
    `.${pagesHostClassName} .breaker {`,
    "  position: relative;",
    "  float: left;",
    "  clear: both;",
    "  left: 0;",
    "  right: 0;",
    "  z-index: 2;",
    "}",
    `.${pagesHostClassName} .breaker--start {`,
    "  height: var(--mxm-pages-padding-top);",
    "}",
    `.${pagesHostClassName} .breaker--page {`,
    "  display: grid;",
    "  grid-template-rows: var(--mxm-pages-padding-bottom) var(--mxm-pages-gap) var(--mxm-pages-padding-top);",
    "  height: var(--mxm-pages-break-height);",
    "}",
    `.${pagesHostClassName} .mxm-page-footer--final {`,
    "  position: absolute;",
    "  left: 0;",
    "  right: 0;",
    "  z-index: 2;",
    "}",
    `.${pagesHostClassName} .mxm-page-region {`,
    "  display: flex;",
    "  box-sizing: border-box;",
    "  width: 100%;",
    "  padding-left: var(--mxm-pages-padding-left);",
    "  padding-right: var(--mxm-pages-padding-right);",
    "  color: rgba(71, 85, 105, 0.92);",
    "  font-size: 12px;",
    "  line-height: 1.4;",
    "}",
    `.${pagesHostClassName} .mxm-page-region-inner {`,
    "  width: 100%;",
    "}",
    `.${pagesHostClassName} .mxm-page-region-inner > * {`,
    "  max-width: 100%;",
    "}",
    `.${pagesHostClassName} .mxm-page-region p {`,
    "  margin: 0;",
    "}",
    `.${pagesHostClassName} .mxm-pagination-gap {`,
    "  position: relative;",
    "  background: var(--mxm-pages-break-background);",
    "}",
    `.${pagesHostClassName} .mxm-pagination-gap::before,`,
    `.${pagesHostClassName} .mxm-pagination-gap::after {`,
    "  content: \"\";",
    "  position: absolute;",
    "  left: 0;",
    "  right: 0;",
    "  height: 1px;",
    "  background: rgba(148, 163, 184, 0.36);",
    "}",
    `.${pagesHostClassName} .mxm-pagination-gap::before {`,
    "  top: 0;",
    "}",
    `.${pagesHostClassName} .mxm-pagination-gap::after {`,
    "  bottom: 0;",
    "}",
  ].join("\n");
}

function ensureStyleElement(storage: PagesStorage, injectNonce?: string) {
  if (typeof document === "undefined" || storage.styleElement || !storage.injectCSS) {
    return;
  }

  const styleElement = document.createElement("style");

  styleElement.setAttribute(pagesStyleAttribute, "true");
  styleElement.textContent = createInjectedStyles();

  if (injectNonce) {
    styleElement.nonce = injectNonce;
  }

  document.head.appendChild(styleElement);
  storage.styleElement = styleElement;
}

function destroyStyleElement(storage: PagesStorage) {
  storage.styleElement?.remove();
  storage.styleElement = null;
}

function getPagesMeta(
  transaction: CommandProps["tr"],
): PagesPluginMeta | undefined {
  return transaction.getMeta(pagesPluginKey) as PagesPluginMeta | undefined;
}

function resolveMetrics(storage: PagesStorage) {
  return storage.getMetrics();
}

function setHostVariables(host: HTMLElement, storage: PagesStorage) {
  const metrics = resolveMetrics(storage);
  const minHeight =
    storage.pageFormat.height * Math.max(storage.pageCount, 1)
    + storage.pageGap * Math.max(storage.pageCount - 1, 0);
  const breakHeight = metrics.topInset + metrics.bottomInset + storage.pageGap;

  host.style.setProperty("--mxm-pages-width", `${storage.pageFormat.width}px`);
  host.style.setProperty("--mxm-pages-height", `${storage.pageFormat.height}px`);
  host.style.setProperty("--mxm-pages-min-height", `${minHeight}px`);
  host.style.setProperty("--mxm-pages-gap", `${storage.pageGap}px`);
  host.style.setProperty(
    "--mxm-pages-break-background",
    storage.pageBreakBackground,
  );
  host.style.setProperty(
    "--mxm-pages-padding-top",
    `${metrics.topInset}px`,
  );
  host.style.setProperty(
    "--mxm-pages-padding-left",
    `${metrics.leftInset}px`,
  );
  host.style.setProperty(
    "--mxm-pages-padding-right",
    `${metrics.rightInset}px`,
  );
  host.style.setProperty(
    "--mxm-pages-padding-bottom",
    `${metrics.bottomInset}px`,
  );
  host.style.setProperty("--mxm-pages-break-height", `${breakHeight}px`);
  host.dataset.pageCount = String(storage.pageCount);
  host.dataset.pageMetrics = JSON.stringify(metrics);
}

function clearHostVariables(host: HTMLElement) {
  host.classList.remove(pagesHostClassName);
  host.style.removeProperty("--mxm-pages-width");
  host.style.removeProperty("--mxm-pages-height");
  host.style.removeProperty("--mxm-pages-min-height");
  host.style.removeProperty("--mxm-pages-gap");
  host.style.removeProperty("--mxm-pages-break-background");
  host.style.removeProperty("--mxm-pages-padding-top");
  host.style.removeProperty("--mxm-pages-padding-left");
  host.style.removeProperty("--mxm-pages-padding-right");
  host.style.removeProperty("--mxm-pages-padding-bottom");
  host.style.removeProperty("--mxm-pages-break-height");
  delete host.dataset.pageCount;
  delete host.dataset.pageMetrics;
}

function setEditorVariables(editor: HTMLElement, storage: PagesStorage) {
  const metrics = resolveMetrics(storage);

  editor.style.setProperty("--page-max-height", `${metrics.availableContentHeight}px`);
}

function clearEditorVariables(editor: HTMLElement) {
  editor.style.removeProperty("--page-max-height");
}

function getHostElement(view: EditorView) {
  return (
    (view.dom.parentElement instanceof HTMLElement
      ? view.dom.parentElement
      : null)
    ?? (view.dom instanceof HTMLElement ? view.dom : null)
  );
}

function parseNumericStyle(value: string | null | undefined) {
  const parsed = Number.parseFloat(value ?? "");

  return Number.isFinite(parsed) ? parsed : 0;
}

function getInterPageBreakHeight(storage: PagesStorage) {
  const metrics = resolveMetrics(storage);

  return metrics.topInset + metrics.bottomInset + storage.pageGap;
}

function isPaginationWidgetWrapper(element: Element) {
  return (
    element instanceof HTMLElement
    && element.classList.contains("ProseMirror-widget")
    && element.firstElementChild instanceof HTMLElement
    && element.firstElementChild.hasAttribute(pagesPaginationAttribute)
  );
}

function getTopLevelDocumentElements(view: EditorView) {
  return Array.from(view.dom.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && !isPaginationWidgetWrapper(child),
  );
}

function estimateNodeHeight(node: ProseMirrorNode) {
  switch (node.type.name) {
    case "heading":
      return 72;
    case "blockquote":
      return 80;
    case "horizontalRule":
      return 32;
    case "image":
      return 280;
    case "table":
      return 220;
    case "codeBlock":
      return 180;
    default:
      return 48;
  }
}

function getNodeHeight(view: EditorView, pos: number, node: ProseMirrorNode) {
  const dom = view.nodeDOM(pos);
  const element =
    dom instanceof HTMLElement
      ? dom
      : dom instanceof Text
        ? dom.parentElement
        : null;

  if (!(element instanceof HTMLElement)) {
    return estimateNodeHeight(node);
  }

  const rect = element.getBoundingClientRect();
  const computedStyle =
    typeof window !== "undefined"
      ? window.getComputedStyle(element)
      : null;
  const height =
    rect.height
    || element.offsetHeight
    || parseNumericStyle(element.style.height)
    || estimateNodeHeight(node);

  return (
    height
    + parseNumericStyle(computedStyle?.marginTop)
    + parseNumericStyle(computedStyle?.marginBottom)
  );
}

function measureFallbackPageBreakPositions(
  view: EditorView,
  storage: PagesStorage,
  pageCount?: number,
) {
  const { availableContentHeight } = resolveMetrics(storage);
  const pageBreakPositions: number[] = [];
  let currentPageHeight = 0;

  view.state.doc.forEach((node, offset) => {
    const nodeHeight = Math.max(getNodeHeight(view, offset, node), 1);

    if (
      currentPageHeight > 0
      && currentPageHeight + nodeHeight > availableContentHeight
    ) {
      pageBreakPositions.push(offset);
      currentPageHeight = nodeHeight;
      return;
    }

    currentPageHeight += nodeHeight;
  });

  return pageBreakPositions.slice(0, Math.max((pageCount ?? pageBreakPositions.length + 1) - 1, 0));
}

function hasUsableDocumentLayout(view: EditorView) {
  const elements = getTopLevelDocumentElements(view);

  if (elements.length <= 1) {
    return true;
  }

  let previousTop: number | null = null;

  for (const element of elements) {
    const rect = element.getBoundingClientRect();

    if (previousTop !== null && Math.abs(rect.top - previousTop) > 0.5) {
      return true;
    }

    previousTop = rect.top;
  }

  return false;
}

function measureContentBottom(view: EditorView) {
  const editorRect = view.dom.getBoundingClientRect();
  const elements = getTopLevelDocumentElements(view);

  if (!elements.length) {
    return 0;
  }

  return elements.reduce((maxBottom, element) => {
    const rect = element.getBoundingClientRect();
    const computedStyle =
      typeof window !== "undefined"
        ? window.getComputedStyle(element)
        : null;

    return Math.max(
      maxBottom,
      rect.bottom - editorRect.top + parseNumericStyle(computedStyle?.marginBottom),
    );
  }, 0);
}

function measureConsumedBreakCount(view: EditorView, contentBottom: number) {
  const editorRect = view.dom.getBoundingClientRect();
  const epsilon = 0.5;

  return Array.from(
    view.dom.querySelectorAll(".breaker--page[data-page-number]"),
  ).reduce(
    (count, element) => {
      if (!(element instanceof HTMLElement)) {
        return count;
      }

      const rect = element.getBoundingClientRect();
      const breakBottom = rect.bottom - editorRect.top;

      return breakBottom <= contentBottom + epsilon ? count + 1 : count;
    },
    0,
  );
}

function measurePageCount(
  view: EditorView,
  storage: PagesStorage,
  renderedPageCount: number,
) {
  if (!hasUsableDocumentLayout(view)) {
    return Math.max(measureFallbackPageBreakPositions(view, storage).length + 1, 1);
  }

  const metrics = resolveMetrics(storage);
  const contentBottom = measureContentBottom(view);
  const renderedBreakCount = Math.max(renderedPageCount - 1, 0);
  const consumedBreakCount = Math.min(
    measureConsumedBreakCount(view, contentBottom),
    renderedBreakCount,
  );
  const normalizedFlowHeight = Math.max(
    contentBottom - metrics.topInset - consumedBreakCount * getInterPageBreakHeight(storage),
    0,
  );
  const epsilon = 0.5;

  return Math.max(
    1,
    Math.ceil(Math.max(normalizedFlowHeight - epsilon, 0) / metrics.availableContentHeight),
  );
}

function findFirstPositionAfterBoundary(options: {
  boundaryTop: number;
  breakHeight: number;
  metrics: ReturnType<typeof resolveMetrics>;
  minPos: number;
  view: EditorView;
}) {
  const editorRect = options.view.dom.getBoundingClientRect();
  const contentWidth =
    options.view.dom.clientWidth - options.metrics.leftInset - options.metrics.rightInset;

  if (contentWidth <= 0) {
    return null;
  }

  const x = Math.min(
    editorRect.left + options.metrics.leftInset + Math.max(contentWidth / 2, 8),
    editorRect.right - options.metrics.rightInset - 8,
  );
  const startY = options.boundaryTop + options.breakHeight + 1;
  const endY = startY + options.metrics.availableContentHeight;

  for (let y = startY; y <= endY; y += 4) {
    const found = options.view.posAtCoords({
      left: x,
      top: y,
    })?.pos;

    if (typeof found === "number" && found > options.minPos) {
      return found;
    }
  }

  const fallback = options.view.posAtCoords({
    left: x,
    top: options.boundaryTop - 1,
  })?.pos;

  if (typeof fallback === "number" && fallback >= options.minPos) {
    return Math.min(fallback + 1, options.view.state.doc.content.size);
  }

  return null;
}

function measurePageBreakPositions(
  view: EditorView,
  storage: PagesStorage,
  pageCount: number,
) {
  const metrics = resolveMetrics(storage);
  const breakHeight = getInterPageBreakHeight(storage);
  const editorRect = view.dom.getBoundingClientRect();
  const positions: number[] = [];
  let minPos = 0;

  for (let pageIndex = 1; pageIndex < pageCount; pageIndex += 1) {
    const boundaryTop =
      editorRect.top
      + metrics.topInset
      + pageIndex * metrics.availableContentHeight
      + (pageIndex - 1) * breakHeight;
    const position = findFirstPositionAfterBoundary({
      boundaryTop,
      breakHeight,
      metrics,
      minPos,
      view,
    });

    if (position === null) {
      break;
    }

    positions.push(position);
    minPos = position;
  }

  if (positions.length === Math.max(pageCount - 1, 0)) {
    return positions;
  }

  return measureFallbackPageBreakPositions(view, storage, pageCount);
}

function resolveRegionValueToHTML(options: {
  value: PagesHeaderFooterValue | null;
  section: "header" | "footer";
  page: number;
  totalPages: number;
  pageFormat: PagesFormat;
  extensions: Extensions;
}) {
  const resolvedValue =
    typeof options.value === "function"
      ? options.value({
          page: options.page,
          totalPages: options.totalPages,
          section: options.section,
          pageFormat: options.pageFormat,
        })
      : options.value;

  if (resolvedValue === null || resolvedValue === undefined) {
    return "";
  }

  if (typeof resolvedValue === "string") {
    return escapeHTML(resolvedValue).replace(/\n/g, "<br/>");
  }

  const content = Array.isArray(resolvedValue)
    ? {
        type: "doc",
        content: resolvedValue,
      }
    : resolvedValue.type === "doc"
      ? resolvedValue
      : {
          type: "doc",
          content: [resolvedValue as JSONContent],
        };

  return renderToHTMLString({
    content,
    extensions: options.extensions,
  });
}

function resolveHeaderFooterHTML(options: {
  storage: PagesStorage;
  section: "header" | "footer";
  page: number;
  totalPages: number;
  extensions: Extensions;
}) {
  const value =
    options.section === "header"
      ? resolveHeaderFooterVariant(
          options.storage.header,
          options.storage,
          options.page,
        )
      : resolveHeaderFooterVariant(
          options.storage.footer,
          options.storage,
          options.page,
        );

  return resolveRegionValueToHTML({
    value,
    section: options.section,
    page: options.page,
    totalPages: options.totalPages,
    pageFormat: options.storage.pageFormat,
    extensions: options.extensions,
  });
}

function resolveHeaderFooterType(
  value: PagesStorage["header"] | PagesStorage["footer"],
  storage: PagesStorage,
  page: number,
): PagesHeaderFooterVariant {
  if (!isHeaderFooterVariants(value)) {
    return "default";
  }

  if (storage.differentFirstPage && page === 1 && value.first !== undefined) {
    return "first";
  }

  if (storage.differentOddEven) {
    if (page % 2 === 0 && value.even !== undefined) {
      return "even";
    }

    if (page % 2 === 1 && value.odd !== undefined) {
      return "odd";
    }
  }

  return "default";
}

function applyDataAttributes(
  element: HTMLElement,
  attributes: Record<string, string>,
) {
  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
}

function buildRegionElement(options: {
  className: string;
  contentHeight: number;
  dataAttributes?: Record<string, string>;
  height: number;
  html: string;
  inset: number;
  position: "start" | "end";
}) {
  const element = document.createElement("div");
  const inner = document.createElement("div");

  element.className = `mxm-page-region ${options.className}`;
  element.style.height = `${options.height}px`;
  element.style.alignItems = options.position === "end" ? "flex-end" : "flex-start";
  element.style.paddingTop = options.position === "start" ? `${options.inset}px` : "0px";
  element.style.paddingBottom = options.position === "end" ? `${options.inset}px` : "0px";
  element.contentEditable = "false";
  if (options.dataAttributes) {
    applyDataAttributes(element, options.dataAttributes);
  }
  inner.className = "mxm-page-region-inner";
  inner.style.minHeight = `${options.contentHeight}px`;
  inner.innerHTML = options.html;
  element.appendChild(inner);

  return element;
}

function createBreakerElement(options: {
  className: string;
  dataAttributes?: Record<string, string>;
  height: number;
}) {
  const element = document.createElement("div");

  element.className = options.className;
  element.style.height = `${options.height}px`;
  element.contentEditable = "false";
  if (options.dataAttributes) {
    applyDataAttributes(element, options.dataAttributes);
  }

  return element;
}

function createPaginationWidget(options: {
  storage: PagesStorage;
  totalPages: number;
  extensions: Extensions;
}) {
  return () => {
    const metrics = resolveMetrics(options.storage);
    const pagination = document.createElement("div");
    const breakHeight = getInterPageBreakHeight(options.storage);

    pagination.setAttribute(pagesPaginationAttribute, "true");
    pagination.id = "pages";
    pagination.contentEditable = "false";

    const firstPage = document.createElement("div");
    const firstAnchor = document.createElement("div");
    const firstBreaker = createBreakerElement({
      className: "breaker breaker--start",
      dataAttributes: {
        "data-page-number": "0",
      },
      height: metrics.topInset,
    });
    const firstHeaderType = resolveHeaderFooterType(
      options.storage.header,
      options.storage,
      1,
    );

    firstPage.className = "mxm-page-break";
    firstPage.dataset.pageNumber = "0";
    firstAnchor.className = "page";
    firstAnchor.dataset.pageNumber = "0";
    firstAnchor.style.marginTop = "0px";
    firstBreaker.appendChild(
      buildRegionElement({
        className: "mxm-page-header",
        contentHeight: options.storage.headerHeight,
        dataAttributes: {
          "data-editable": "true",
          "data-header-page-number": "1",
          "data-header-type": firstHeaderType,
        },
        height: metrics.topInset,
        html: resolveHeaderFooterHTML({
          storage: options.storage,
          section: "header",
          page: 1,
          totalPages: options.totalPages,
          extensions: options.extensions,
        }),
        inset: options.storage.headerTopMargin,
        position: "start",
      }),
    );
    firstPage.appendChild(firstAnchor);
    firstPage.appendChild(firstBreaker);
    pagination.appendChild(firstPage);

    for (let pageIndex = 1; pageIndex < options.totalPages; pageIndex += 1) {
      const pageBreak = document.createElement("div");
      const pageAnchor = document.createElement("div");
      const footerPage = pageIndex;
      const headerPage = pageIndex + 1;
      const footerType = resolveHeaderFooterType(
        options.storage.footer,
        options.storage,
        footerPage,
      );
      const headerType = resolveHeaderFooterType(
        options.storage.header,
        options.storage,
        headerPage,
      );
      const breakElement = createBreakerElement({
        className: "breaker breaker--page",
        dataAttributes: {
          "data-page-number": String(pageIndex),
        },
        height: breakHeight,
      });
      const gap = document.createElement("div");

      pageBreak.className = "mxm-page-break";
      pageBreak.dataset.pageNumber = String(pageIndex);
      pageAnchor.className = "page";
      pageAnchor.dataset.pageNumber = String(pageIndex);
      pageAnchor.style.marginTop = `${metrics.availableContentHeight}px`;
      gap.className = "mxm-pagination-gap";
      gap.style.height = `${options.storage.pageGap}px`;
      gap.contentEditable = "false";

      breakElement.appendChild(
        buildRegionElement({
          className: "mxm-page-footer",
          contentHeight: options.storage.footerHeight,
          dataAttributes: {
            "data-editable": "true",
            "data-footer-page-number": String(footerPage),
            "data-footer-type": footerType,
          },
          height: metrics.bottomInset,
          html: resolveHeaderFooterHTML({
            storage: options.storage,
            section: "footer",
            page: footerPage,
            totalPages: options.totalPages,
            extensions: options.extensions,
          }),
          inset: options.storage.footerBottomMargin,
          position: "end",
        }),
      );
      breakElement.appendChild(gap);
      breakElement.appendChild(
        buildRegionElement({
          className: "mxm-page-header",
          contentHeight: options.storage.headerHeight,
          dataAttributes: {
            "data-editable": "true",
            "data-header-page-number": String(headerPage),
            "data-header-type": headerType,
          },
          height: metrics.topInset,
          html: resolveHeaderFooterHTML({
            storage: options.storage,
            section: "header",
            page: headerPage,
            totalPages: options.totalPages,
            extensions: options.extensions,
          }),
          inset: options.storage.headerTopMargin,
          position: "start",
        }),
      );

      pageBreak.appendChild(pageAnchor);
      pageBreak.appendChild(breakElement);
      pagination.appendChild(pageBreak);
    }

    const finalFooter = document.createElement("div");
    const finalFooterTop =
      (options.totalPages - 1)
      * (options.storage.pageFormat.height + options.storage.pageGap)
      + (options.storage.pageFormat.height - metrics.bottomInset);
    const finalFooterType = resolveHeaderFooterType(
      options.storage.footer,
      options.storage,
      options.totalPages,
    );

    finalFooter.className = "mxm-page-footer mxm-page-footer--final";
    finalFooter.style.top = `${finalFooterTop}px`;
    finalFooter.contentEditable = "false";
    applyDataAttributes(finalFooter, {
      "data-editable": "true",
      "data-footer-page-number": String(options.totalPages),
      "data-footer-type": finalFooterType,
    });
    finalFooter.appendChild(
      buildRegionElement({
        className: "mxm-page-footer__inner",
        contentHeight: options.storage.footerHeight,
        height: metrics.bottomInset,
        html: resolveHeaderFooterHTML({
          storage: options.storage,
          section: "footer",
          page: options.totalPages,
          totalPages: options.totalPages,
          extensions: options.extensions,
        }),
        inset: options.storage.footerBottomMargin,
        position: "end",
      }),
    );
    pagination.appendChild(finalFooter);

    return pagination;
  };
}

function updateStorageLayout(
  storage: PagesStorage,
  pageBreakPositions: number[],
  pageCount: number,
) {
  storage.pageBreakPositions = pageBreakPositions;
  storage.pageCount = pageCount;
}

function getPageNumberFromVerticalOffset(storage: PagesStorage, offset: number) {
  const metrics = resolveMetrics(storage);
  const cycleHeight = metrics.availableContentHeight + getInterPageBreakHeight(storage);

  if (offset <= metrics.topInset) {
    return 1;
  }

  return Math.max(1, Math.floor((offset - metrics.topInset) / cycleHeight) + 1);
}

function createPluginView(options: {
  storage: PagesStorage;
}) {
  return (view: EditorView) => {
    const host = getHostElement(view);
    let frameHandle = 0;
    let destroyed = false;

    const applyClasses = () => {
      const nextHost = getHostElement(view);

      if (!nextHost) {
        return;
      }

      nextHost.classList.add(pagesHostClassName);
      view.dom.classList.add(pagesEditorClassName);
      setHostVariables(nextHost, options.storage);
      setEditorVariables(view.dom, options.storage);
    };

    const resolvePageNumber = (pos: number) => {
      try {
        const coords = view.coordsAtPos(pos);
        const top = coords.top - view.dom.getBoundingClientRect().top;

        return getPageNumberFromVerticalOffset(options.storage, top);
      } catch {
        return getPageNumberFromPosition(options.storage, pos);
      }
    };

    const measure = () => {
      if (destroyed) {
        return;
      }

      applyClasses();
      const pluginState = pagesPluginKey.getState(view.state) ?? createEmptyPluginState();
      const pageCount = measurePageCount(view, options.storage, pluginState.pageCount);
      const pageBreakPositions =
        pluginState.pageCount === pageCount
          ? measurePageBreakPositions(
              view,
              options.storage,
              pageCount,
            )
          : pluginState.pageBreakPositions.slice(0, Math.max(pageCount - 1, 0));

      updateStorageLayout(options.storage, pageBreakPositions, pageCount);
      options.storage.getPageNumber = resolvePageNumber;
      applyClasses();

      if (
        pluginState.pageCount === pageCount
        && arePageBreakPositionsEqual(
          pluginState.pageBreakPositions,
          pageBreakPositions,
        )
      ) {
        return;
      }

      view.dispatch(
        view.state.tr.setMeta(pagesPluginKey, {
          type: "layout",
          pageBreakPositions,
          pageCount,
        } satisfies PagesPluginMeta),
      );
    };

    const scheduleMeasure = () => {
      if (destroyed) {
        return;
      }

      if (typeof window === "undefined") {
        measure();
        return;
      }

      window.cancelAnimationFrame(frameHandle);
      frameHandle = window.requestAnimationFrame(() => {
        measure();
      });
    };

    const handleResize = () => {
      scheduleMeasure();
    };

    const handleLoad = () => {
      scheduleMeasure();
    };

    if (host) {
      host.classList.add(pagesHostClassName);
    }

    view.dom.classList.add(pagesEditorClassName);
    options.storage.getPageNumber = resolvePageNumber;

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
    }

    view.dom.addEventListener("load", handleLoad, true);
    scheduleMeasure();

    return {
      update: () => {
        scheduleMeasure();
      },
      destroy: () => {
        destroyed = true;
        view.dom.removeEventListener("load", handleLoad, true);
        view.dom.classList.remove(pagesEditorClassName);
        clearEditorVariables(view.dom);

        if (host) {
          clearHostVariables(host);
        }

        if (typeof window !== "undefined") {
          window.cancelAnimationFrame(frameHandle);
          window.removeEventListener("resize", handleResize);
        }

        options.storage.getPageNumber = (pos: number) =>
          getPageNumberFromPosition(options.storage, pos);
      },
    };
  };
}

function getPageBreakPositionsFromState(
  state: PagesPluginState | undefined,
) {
  return state?.pageBreakPositions ?? [];
}

function createEmptyPluginState(): PagesPluginState {
  return {
    pageBreakPositions: [],
    pageCount: 1,
    revision: 0,
  };
}

function getPageNumberFromPosition(storage: PagesStorage, pos: number) {
  for (let index = 0; index < storage.pageBreakPositions.length; index += 1) {
    if (pos < storage.pageBreakPositions[index]!) {
      return index + 1;
    }
  }

  return Math.max(storage.pageBreakPositions.length + 1, 1);
}

export const Pages = Extension.create<PagesOptions, PagesStorage>({
  name: "pages",

  addOptions() {
    return {
      pageFormat: "A4",
      pageGap: 50,
      pageBreakBackground: "#e5e7eb",
      headerHeight: 48,
      footerHeight: 48,
      headerTopMargin: 48,
      footerBottomMargin: 48,
      header: null,
      footer: null,
      differentFirstPage: false,
      differentOddEven: false,
      injectCSS: true,
      injectNonce: undefined,
    };
  },

  addStorage() {
    const storage: PagesStorage = {
      pageCount: 1,
      pageBreakPositions: [],
      pageFormat: resolvePageFormat(defaultPageFormat),
      pageGap: 50,
      pageBreakBackground: "#e5e7eb",
      headerHeight: 48,
      footerHeight: 48,
      headerTopMargin: 48,
      footerBottomMargin: 48,
      header: null,
      footer: null,
      differentFirstPage: false,
      differentOddEven: false,
      injectCSS: true,
      styleElement: null,
      getPageNumber: (pos: number) => getPageNumberFromPosition(storage, pos),
      getMetrics: () =>
        getPagesLayoutMetrics({
          pageFormat: storage.pageFormat,
        }),
    };

    return storage;
  },

  onCreate() {
    setStorageFromOptions(this.storage, this.options);
    ensureStyleElement(this.storage, this.options.injectNonce);

    queueMicrotask(() => {
      if (!this.editor.view) {
        return;
      }

      this.editor.view.dispatch(
        this.editor.state.tr.setMeta(pagesPluginKey, {
          type: "options",
        } satisfies PagesPluginMeta),
      );
    });
  },

  onDestroy() {
    destroyStyleElement(this.storage);
  },

  addCommands() {
    const setOptionsMeta =
      (props: CommandProps) =>
        props.commands.setMeta(pagesPluginKey, {
          type: "options",
        } satisfies PagesPluginMeta);
    const setHeaderFooterVariant =
      (
        section: "header" | "footer",
        variant: PagesHeaderFooterVariant,
        value: PagesHeaderFooterValue | null,
      ) =>
      (props: CommandProps) => {
        if (!props.dispatch) {
          return true;
        }

        this.options[section] = updateHeaderFooterVariant(
          this.options[section],
          variant,
          value,
        );
        setStorageFromOptions(this.storage, this.options);
        return setOptionsMeta(props);
      };

    return {
      setPageFormat:
        (options: SetPageFormatOptions | PagesFormatInput | string) =>
        (props: CommandProps) => {
          const nextPageFormat =
            typeof options === "object" && "pageFormat" in options
              ? options.pageFormat
              : options;

          if (
            typeof nextPageFormat !== "string"
            && !isPagesFormat(nextPageFormat)
          ) {
            return false;
          }

          if (!props.dispatch) {
            return true;
          }

          this.options.pageFormat = nextPageFormat as PagesOptions["pageFormat"];
          setStorageFromOptions(this.storage, this.options);
          return setOptionsMeta(props);
        },
      setPageGap:
        (pageGap: number) =>
        (props: CommandProps) => {
          if (!Number.isFinite(pageGap) || pageGap < 0) {
            return false;
          }

          if (!props.dispatch) {
            return true;
          }

          this.options.pageGap = clampPositiveNumber(pageGap, this.options.pageGap);
          setStorageFromOptions(this.storage, this.options);
          return setOptionsMeta(props);
        },
      setPageBreakBackground:
        (pageBreakBackground: string) =>
        (props: CommandProps) => {
          if (!pageBreakBackground.trim()) {
            return false;
          }

          if (!props.dispatch) {
            return true;
          }

          this.options.pageBreakBackground = pageBreakBackground;
          setStorageFromOptions(this.storage, this.options);
          return setOptionsMeta(props);
        },
      setHeaderHeight:
        (headerHeight: number) =>
        (props: CommandProps) => {
          if (!Number.isFinite(headerHeight) || headerHeight < 0) {
            return false;
          }

          if (!props.dispatch) {
            return true;
          }

          this.options.headerHeight = headerHeight;
          setStorageFromOptions(this.storage, this.options);
          return setOptionsMeta(props);
        },
      setFooterHeight:
        (footerHeight: number) =>
        (props: CommandProps) => {
          if (!Number.isFinite(footerHeight) || footerHeight < 0) {
            return false;
          }

          if (!props.dispatch) {
            return true;
          }

          this.options.footerHeight = footerHeight;
          setStorageFromOptions(this.storage, this.options);
          return setOptionsMeta(props);
        },
      setHeaderTopMargin:
        (headerTopMargin: number) =>
        (props: CommandProps) => {
          if (!Number.isFinite(headerTopMargin) || headerTopMargin < 0) {
            return false;
          }

          if (!props.dispatch) {
            return true;
          }

          this.options.headerTopMargin = headerTopMargin;
          setStorageFromOptions(this.storage, this.options);
          return setOptionsMeta(props);
        },
      setFooterBottomMargin:
        (footerBottomMargin: number) =>
        (props: CommandProps) => {
          if (!Number.isFinite(footerBottomMargin) || footerBottomMargin < 0) {
            return false;
          }

          if (!props.dispatch) {
            return true;
          }

          this.options.footerBottomMargin = footerBottomMargin;
          setStorageFromOptions(this.storage, this.options);
          return setOptionsMeta(props);
        },
      setHeader:
        ({ value, variant = "default" }: SetHeaderFooterOptions) =>
        setHeaderFooterVariant("header", variant, value),
      setFooter:
        ({ value, variant = "default" }: SetHeaderFooterOptions) =>
        setHeaderFooterVariant("footer", variant, value),
      setHeaderFirstPage:
        (value: PagesHeaderFooterValue | null) =>
        setHeaderFooterVariant("header", "first", value),
      setFooterFirstPage:
        (value: PagesHeaderFooterValue | null) =>
        setHeaderFooterVariant("footer", "first", value),
      setHeaderOdd:
        (value: PagesHeaderFooterValue | null) =>
        setHeaderFooterVariant("header", "odd", value),
      setHeaderEven:
        (value: PagesHeaderFooterValue | null) =>
        setHeaderFooterVariant("header", "even", value),
      setFooterOdd:
        (value: PagesHeaderFooterValue | null) =>
        setHeaderFooterVariant("footer", "odd", value),
      setFooterEven:
        (value: PagesHeaderFooterValue | null) =>
        setHeaderFooterVariant("footer", "even", value),
      setDifferentFirstPage:
        (differentFirstPage: boolean) =>
        (props: CommandProps) => {
          if (!props.dispatch) {
            return true;
          }

          this.options.differentFirstPage = differentFirstPage;
          setStorageFromOptions(this.storage, this.options);
          return setOptionsMeta(props);
        },
      setDifferentOddEven:
        (differentOddEven: boolean) =>
        (props: CommandProps) => {
          if (!props.dispatch) {
            return true;
          }

          this.options.differentOddEven = differentOddEven;
          setStorageFromOptions(this.storage, this.options);
          return setOptionsMeta(props);
        },
      repaginate:
        () =>
        (props: CommandProps) => {
          if (!props.dispatch) {
            return true;
          }

          setStorageFromOptions(this.storage, this.options);
          return setOptionsMeta(props);
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<PagesPluginState>({
        key: pagesPluginKey,
        state: {
          init: () => {
            setStorageFromOptions(this.storage, this.options);
            return createEmptyPluginState();
          },
          apply: (transaction, pluginState) => {
            const meta = getPagesMeta(transaction);

            if (!meta) {
              return pluginState;
            }

            if (meta.type === "options") {
              return {
                ...pluginState,
                revision: pluginState.revision + 1,
              };
            }

            updateStorageLayout(
              this.storage,
              meta.pageBreakPositions,
              meta.pageCount,
            );

            return {
              ...pluginState,
              pageBreakPositions: meta.pageBreakPositions,
              pageCount: meta.pageCount,
            };
          },
        },
        props: {
          decorations: (state) => {
            const pluginState = pagesPluginKey.getState(state) ?? createEmptyPluginState();
            const widgetRevision = `${pluginState.revision}-${pluginState.pageCount}`;
            const decorations = [
              Decoration.widget(
                0,
                createPaginationWidget({
                  storage: this.storage,
                  totalPages: pluginState.pageCount,
                  extensions: this.editor.extensionManager.extensions,
                }),
                {
                  key: `mxm-pages-pagination-${widgetRevision}`,
                  side: -1,
                  ignoreSelection: true,
                },
              ),
            ];

            return DecorationSet.create(state.doc, decorations);
          },
        },
        view: createPluginView({
          storage: this.storage,
        }),
      }),
    ];
  },
});

export {
  PAGE_FORMATS,
};
