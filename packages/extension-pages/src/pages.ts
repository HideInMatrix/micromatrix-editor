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
const pagesEditorClassName = "mxm-pages__editor";

function createInjectedStyles() {
  return [
    `.${pagesHostClassName} {`,
    "  --mxm-pages-width: 794px;",
    "  --mxm-pages-height: 1123px;",
    "  --mxm-pages-gap: 50px;",
    "  --mxm-pages-break-background: #e5e7eb;",
    "  --mxm-pages-padding-left: 96px;",
    "  --mxm-pages-padding-right: 96px;",
    "  --mxm-pages-surface: var(--mxm-pages-page-background, #ffffff);",
    "  position: relative;",
    "  background: var(--mxm-pages-break-background);",
    "}",
    `.${pagesHostClassName} .${pagesEditorClassName} {`,
    "  position: relative;",
    "  width: min(100%, var(--mxm-pages-width));",
    "  min-height: var(--mxm-pages-height);",
    "  margin: 0 auto;",
    "  box-sizing: border-box;",
    "  padding-left: var(--mxm-pages-padding-left);",
    "  padding-right: var(--mxm-pages-padding-right);",
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
    `.${pagesHostClassName} .mxm-pages__edge,`,
    `.${pagesHostClassName} .mxm-pages__break {`,
    "  display: block;",
    "  margin-left: calc(var(--mxm-pages-padding-left) * -1);",
    "  margin-right: calc(var(--mxm-pages-padding-right) * -1);",
    "  pointer-events: none;",
    "}",
    `.${pagesHostClassName} .mxm-pages__break {`,
    "  display: grid;",
    "}",
    `.${pagesHostClassName} .mxm-pages__region {`,
    "  display: flex;",
    "  box-sizing: border-box;",
    "  width: 100%;",
    "  padding-left: var(--mxm-pages-padding-left);",
    "  padding-right: var(--mxm-pages-padding-right);",
    "  color: rgba(71, 85, 105, 0.92);",
    "  font-size: 12px;",
    "  line-height: 1.4;",
    "}",
    `.${pagesHostClassName} .mxm-pages__region-inner {`,
    "  width: 100%;",
    "}",
    `.${pagesHostClassName} .mxm-pages__region-inner > * {`,
    "  max-width: 100%;",
    "}",
    `.${pagesHostClassName} .mxm-pages__region p {`,
    "  margin: 0;",
    "}",
    `.${pagesHostClassName} .mxm-pages__gap {`,
    "  position: relative;",
    "  background: var(--mxm-pages-break-background);",
    "}",
    `.${pagesHostClassName} .mxm-pages__gap::before,`,
    `.${pagesHostClassName} .mxm-pages__gap::after {`,
    "  content: \"\";",
    "  position: absolute;",
    "  left: 0;",
    "  right: 0;",
    "  height: 1px;",
    "  background: rgba(148, 163, 184, 0.36);",
    "}",
    `.${pagesHostClassName} .mxm-pages__gap::before {`,
    "  top: 0;",
    "}",
    `.${pagesHostClassName} .mxm-pages__gap::after {`,
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

  host.style.setProperty("--mxm-pages-width", `${storage.pageFormat.width}px`);
  host.style.setProperty("--mxm-pages-height", `${storage.pageFormat.height}px`);
  host.style.setProperty("--mxm-pages-gap", `${storage.pageGap}px`);
  host.style.setProperty(
    "--mxm-pages-break-background",
    storage.pageBreakBackground,
  );
  host.style.setProperty(
    "--mxm-pages-padding-left",
    `${metrics.leftInset}px`,
  );
  host.style.setProperty(
    "--mxm-pages-padding-right",
    `${metrics.rightInset}px`,
  );
  host.dataset.pageCount = String(storage.pageCount);
  host.dataset.pageMetrics = JSON.stringify(metrics);
}

function clearHostVariables(host: HTMLElement) {
  host.classList.remove(pagesHostClassName);
  host.style.removeProperty("--mxm-pages-width");
  host.style.removeProperty("--mxm-pages-height");
  host.style.removeProperty("--mxm-pages-gap");
  host.style.removeProperty("--mxm-pages-break-background");
  host.style.removeProperty("--mxm-pages-padding-left");
  host.style.removeProperty("--mxm-pages-padding-right");
  delete host.dataset.pageCount;
  delete host.dataset.pageMetrics;
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

function measurePageBreakPositions(
  view: EditorView,
  storage: PagesStorage,
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

  return {
    pageBreakPositions,
    pageCount: Math.max(pageBreakPositions.length + 1, 1),
  };
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

function buildRegionElement(options: {
  className: string;
  contentHeight: number;
  height: number;
  html: string;
  inset: number;
  position: "start" | "end";
}) {
  const element = document.createElement("div");
  const inner = document.createElement("div");

  element.className = `mxm-pages__region ${options.className}`;
  element.style.height = `${options.height}px`;
  element.style.alignItems = options.position === "end" ? "flex-end" : "flex-start";
  element.style.paddingTop = options.position === "start" ? `${options.inset}px` : "0px";
  element.style.paddingBottom = options.position === "end" ? `${options.inset}px` : "0px";
  element.contentEditable = "false";
  inner.className = "mxm-pages__region-inner";
  inner.style.minHeight = `${options.contentHeight}px`;
  inner.innerHTML = options.html;
  element.appendChild(inner);

  return element;
}

function createStartWidget(options: {
  storage: PagesStorage;
  totalPages: number;
  extensions: Extensions;
}) {
  return () => {
    const metrics = resolveMetrics(options.storage);
    const element = document.createElement("div");

    element.className = "mxm-pages__edge mxm-pages__edge--start";
    element.style.height = `${metrics.topInset}px`;
    element.contentEditable = "false";
    element.appendChild(
      buildRegionElement({
        className: "mxm-pages__region--header",
        contentHeight: options.storage.headerHeight,
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

    return element;
  };
}

function createEndWidget(options: {
  storage: PagesStorage;
  totalPages: number;
  extensions: Extensions;
}) {
  return () => {
    const metrics = resolveMetrics(options.storage);
    const element = document.createElement("div");

    element.className = "mxm-pages__edge mxm-pages__edge--end";
    element.style.height = `${metrics.bottomInset}px`;
    element.contentEditable = "false";
    element.appendChild(
      buildRegionElement({
        className: "mxm-pages__region--footer",
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

    return element;
  };
}

function createBreakWidget(options: {
  storage: PagesStorage;
  page: number;
  totalPages: number;
  extensions: Extensions;
}) {
  return () => {
    const metrics = resolveMetrics(options.storage);
    const element = document.createElement("div");
    const gap = document.createElement("div");

    element.className = "mxm-pages__break";
    element.style.gridTemplateRows = `${metrics.bottomInset}px ${options.storage.pageGap}px ${metrics.topInset}px`;
    element.style.height = `${metrics.bottomInset + options.storage.pageGap + metrics.topInset}px`;
    element.contentEditable = "false";
    gap.className = "mxm-pages__gap";
    gap.style.height = `${options.storage.pageGap}px`;
    gap.contentEditable = "false";

    element.appendChild(
      buildRegionElement({
        className: "mxm-pages__region--footer",
        contentHeight: options.storage.footerHeight,
        height: metrics.bottomInset,
        html: resolveHeaderFooterHTML({
          storage: options.storage,
          section: "footer",
          page: options.page,
          totalPages: options.totalPages,
          extensions: options.extensions,
        }),
        inset: options.storage.footerBottomMargin,
        position: "end",
      }),
    );
    element.appendChild(gap);
    element.appendChild(
      buildRegionElement({
        className: "mxm-pages__region--header",
        contentHeight: options.storage.headerHeight,
        height: metrics.topInset,
        html: resolveHeaderFooterHTML({
          storage: options.storage,
          section: "header",
          page: options.page + 1,
          totalPages: options.totalPages,
          extensions: options.extensions,
        }),
        inset: options.storage.headerTopMargin,
        position: "start",
      }),
    );

    return element;
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
    };

    const measure = () => {
      if (destroyed) {
        return;
      }

      applyClasses();

      const { pageBreakPositions, pageCount } = measurePageBreakPositions(
        view,
        options.storage,
      );
      const pluginState = pagesPluginKey.getState(view.state);

      updateStorageLayout(options.storage, pageBreakPositions, pageCount);
      applyClasses();

      if (
        pluginState
        && pluginState.pageCount === pageCount
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

        if (host) {
          clearHostVariables(host);
        }

        if (typeof window !== "undefined") {
          window.cancelAnimationFrame(frameHandle);
          window.removeEventListener("resize", handleResize);
        }
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
                createStartWidget({
                  storage: this.storage,
                  totalPages: pluginState.pageCount,
                  extensions: this.editor.extensionManager.extensions,
                }),
                {
                  key: `mxm-pages-start-${widgetRevision}`,
                  side: -1,
                  ignoreSelection: true,
                },
              ),
              ...getPageBreakPositionsFromState(pluginState).map((pos, index) =>
                Decoration.widget(
                  pos,
                  createBreakWidget({
                    storage: this.storage,
                    page: index + 1,
                    totalPages: pluginState.pageCount,
                    extensions: this.editor.extensionManager.extensions,
                  }),
                  {
                    key: `mxm-pages-break-${index}-${widgetRevision}`,
                    side: -1,
                    ignoreSelection: true,
                  },
                )),
              Decoration.widget(
                state.doc.content.size,
                createEndWidget({
                  storage: this.storage,
                  totalPages: pluginState.pageCount,
                  extensions: this.editor.extensionManager.extensions,
                }),
                {
                  key: `mxm-pages-end-${widgetRevision}`,
                  side: 1,
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
