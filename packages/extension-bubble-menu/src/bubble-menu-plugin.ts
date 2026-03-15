import type { Editor } from "@mxm-editor/core";
import {
  NodeSelection,
  Plugin,
  PluginKey,
  type EditorState,
  type EditorView,
} from "@mxm-editor/pm";
import {
  autoPlacement as floatingAutoPlacement,
  arrow as floatingArrow,
  computePosition,
  flip as floatingFlip,
  hide as floatingHide,
  inline as floatingInline,
  offset as floatingOffset,
  shift as floatingShift,
  size as floatingSize,
  type ArrowOptions,
  type AutoPlacementOptions,
  type FlipOptions,
  type HideOptions,
  type InlineOptions,
  type Middleware,
  type OffsetOptions,
  type Placement,
  type ShiftOptions,
  type SizeOptions,
  type Strategy,
  type VirtualElement,
} from "@floating-ui/dom";

export interface BubbleMenuVisibilityContext {
  editor: Editor;
  view: Editor["view"];
  state: Editor["state"];
  oldState: EditorState | null;
  from: number;
  to: number;
}

export type BubbleMenuVisibilityContextWithEditor =
  BubbleMenuVisibilityContext & Editor;

export type BubbleMenuShouldShow = (
  context: BubbleMenuVisibilityContextWithEditor,
) => boolean;

export type BubbleMenuAppendTo = HTMLElement | (() => HTMLElement);

export type BubbleMenuVirtualElement = VirtualElement;

export interface BubbleMenuPluginOptions {
  strategy?: Strategy;
  placement?: Placement;
  offset?: number | OffsetOptions;
  flip?: boolean | FlipOptions;
  shift?: boolean | ShiftOptions;
  arrow?: boolean | ArrowOptions;
  size?: boolean | SizeOptions;
  autoPlacement?: boolean | AutoPlacementOptions;
  hide?: boolean | HideOptions;
  inline?: boolean | InlineOptions;
  scrollTarget?: HTMLElement | Window | null;
  onShow?: () => void;
  onHide?: () => void;
  onUpdate?: () => void;
  onDestroy?: () => void;
}

export interface BubbleMenuPluginProps {
  editor: Editor;
  element: HTMLElement;
  pluginKey?: string | PluginKey;
  updateDelay?: number;
  resizeDelay?: number;
  appendTo?: BubbleMenuAppendTo;
  shouldShow?: BubbleMenuShouldShow;
  getReferencedVirtualElement?: () => BubbleMenuVirtualElement | null;
  options?: BubbleMenuPluginOptions;
  onShow?: (context: BubbleMenuVisibilityContextWithEditor) => void;
  onHide?: (context: BubbleMenuVisibilityContextWithEditor) => void;
  onUpdate?: (context: BubbleMenuVisibilityContextWithEditor) => void;
  onDestroy?: (context: BubbleMenuVisibilityContextWithEditor) => void;
}

interface BubbleMenuPluginConfig extends BubbleMenuPluginProps {
  getProps?: () => BubbleMenuPluginProps;
}

const DEFAULT_STRATEGY: Strategy = "fixed";
const DEFAULT_PLACEMENT: Placement = "top";

export const bubbleMenuPluginKey = new PluginKey("bubbleMenu");

function resolvePluginKey(pluginKey?: string | PluginKey) {
  if (!pluginKey) {
    return bubbleMenuPluginKey;
  }

  return typeof pluginKey === "string"
    ? new PluginKey(pluginKey)
    : pluginKey;
}

function createMenuVisibilityContext(
  editor: Editor,
  oldState: EditorState | null = null,
): BubbleMenuVisibilityContextWithEditor {
  const state = editor.state;

  return Object.assign(Object.create(editor), {
    editor,
    oldState,
    from: state.selection.from,
    to: state.selection.to,
  });
}

function defaultShouldShow(editor: Editor, view: EditorView) {
  const { selection } = view.state;

  if (!editor.isEditable || !view.hasFocus() || selection.empty) {
    return false;
  }

  if (selection instanceof NodeSelection) {
    return true;
  }

  return selection.from !== selection.to;
}

function getSelectionRect(view: EditorView) {
  const { selection } = view.state;

  if (selection instanceof NodeSelection) {
    const node = view.nodeDOM(selection.from);

    if (node instanceof Element) {
      return node.getBoundingClientRect();
    }
  }

  const domSelection = window.getSelection();

  if (domSelection?.rangeCount) {
    const range = domSelection.getRangeAt(0);
    const node =
      range.commonAncestorContainer instanceof Element
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;

    if (node && view.dom.contains(node)) {
      const rect = range.getBoundingClientRect();

      if (rect.width || rect.height) {
        return rect;
      }
    }
  }

  const start = view.coordsAtPos(selection.from);
  const end = view.coordsAtPos(selection.to);

  return new DOMRect(
    Math.min(start.left, end.left),
    Math.min(start.top, end.top),
    Math.max(end.right - start.left, 1),
    Math.max(Math.max(start.bottom, end.bottom) - Math.min(start.top, end.top), 1),
  );
}

function resolveAppendTarget(
  appendTo: BubbleMenuAppendTo | undefined,
  element: HTMLElement,
) {
  if (appendTo instanceof HTMLElement) {
    return appendTo;
  }

  if (typeof appendTo === "function") {
    const resolvedElement = appendTo();

    if (resolvedElement instanceof HTMLElement) {
      return resolvedElement;
    }
  }

  return element.ownerDocument.body;
}

function createReferenceFromRect(
  rect: DOMRect | DOMRectReadOnly,
  contextElement: Element,
): BubbleMenuVirtualElement {
  return {
    contextElement,
    getBoundingClientRect: () => rect,
  };
}

function createMiddleware(options: BubbleMenuPluginOptions | undefined) {
  const middleware: Middleware[] = [];

  if (options?.offset !== undefined) {
    middleware.push(floatingOffset(options.offset));
  }

  if (options?.flip) {
    middleware.push(
      floatingFlip(typeof options.flip === "object" ? options.flip : {}),
    );
  }

  if (options?.shift) {
    middleware.push(
      floatingShift(typeof options.shift === "object" ? options.shift : {}),
    );
  }

  if (options?.arrow && typeof options.arrow === "object") {
    middleware.push(floatingArrow(options.arrow));
  }

  if (options?.size) {
    middleware.push(
      floatingSize(typeof options.size === "object" ? options.size : {}),
    );
  }

  if (options?.autoPlacement) {
    middleware.push(
      floatingAutoPlacement(
        typeof options.autoPlacement === "object"
          ? options.autoPlacement
          : {},
      ),
    );
  }

  if (options?.hide) {
    middleware.push(
      floatingHide(typeof options.hide === "object" ? options.hide : {}),
    );
  }

  if (options?.inline) {
    middleware.push(
      floatingInline(typeof options.inline === "object" ? options.inline : {}),
    );
  }

  return middleware;
}

class BubbleMenuView {
  private readonly editor: Editor;

  private readonly element: HTMLElement;

  private readonly getProps: () => BubbleMenuPluginProps;

  private readonly handleEditorFocus = () => {
    this.scheduleUpdate(this.editor.state);
  };

  private readonly handleEditorBlur = (event: FocusEvent) => {
    const relatedTarget = event.relatedTarget;

    if (relatedTarget instanceof Node && this.element.contains(relatedTarget)) {
      return;
    }

    this.scheduleAnimationFrameUpdate(this.editor.state);
  };

  private readonly handleWindowScroll = () => {
    this.scheduleResizeUpdate(this.editor.state);
  };

  private readonly handleWindowResize = () => {
    this.scheduleResizeUpdate(this.editor.state);
  };

  private readonly handleObservedResize = () => {
    this.scheduleResizeUpdate(this.editor.state);
  };

  private readonly resizeObserver =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(this.handleObservedResize);

  private scrollTarget: HTMLElement | Window | null = null;

  private updateTimer: ReturnType<typeof window.setTimeout> | null = null;

  private resizeTimer: ReturnType<typeof window.setTimeout> | null = null;

  private animationFrame: number | null = null;

  private visible = false;

  private destroyed = false;

  private positionToken = 0;

  constructor(
    private view: EditorView,
    props: BubbleMenuPluginConfig,
  ) {
    this.editor = props.editor;
    this.element = props.element;
    this.getProps = props.getProps ?? (() => props);

    this.element.dataset.mxmEditorMenu = "bubble";
    this.hideElement();
    this.ensureAppendTarget();
    this.bindScrollTarget();
    this.view.dom.addEventListener("focus", this.handleEditorFocus, true);
    this.view.dom.addEventListener("blur", this.handleEditorBlur, true);
    window.addEventListener("scroll", this.handleWindowScroll, true);
    window.addEventListener("resize", this.handleWindowResize);
    this.observe();
    this.scheduleAnimationFrameUpdate(this.view.state);
  }

  update(view: EditorView, oldState: EditorState) {
    this.view = view;
    this.bindScrollTarget();
    this.observe();
    this.scheduleUpdate(oldState);
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.clearTimers();
    this.unobserve();
    this.unbindScrollTarget();
    this.view.dom.removeEventListener("focus", this.handleEditorFocus, true);
    this.view.dom.removeEventListener("blur", this.handleEditorBlur, true);
    window.removeEventListener("scroll", this.handleWindowScroll, true);
    window.removeEventListener("resize", this.handleWindowResize);
    this.hideElement();
    this.element.remove();

    const context = createMenuVisibilityContext(this.editor, this.editor.state);
    const props = this.getProps();

    props.options?.onDestroy?.();
    props.onDestroy?.(context);
  }

  private observe() {
    if (!this.resizeObserver) {
      return;
    }

    this.resizeObserver.disconnect();
    this.resizeObserver.observe(this.element);
    this.resizeObserver.observe(this.view.dom);
  }

  private unobserve() {
    this.resizeObserver?.disconnect();
  }

  private clearTimers() {
    if (this.updateTimer !== null) {
      window.clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.resizeTimer !== null) {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }

    if (this.animationFrame !== null) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private bindScrollTarget() {
    const nextScrollTarget = this.getProps().options?.scrollTarget ?? null;

    if (this.scrollTarget === nextScrollTarget) {
      return;
    }

    this.unbindScrollTarget();
    this.scrollTarget = nextScrollTarget;

    if (this.scrollTarget && this.scrollTarget !== window) {
      this.scrollTarget.addEventListener("scroll", this.handleWindowScroll, true);
    }
  }

  private unbindScrollTarget() {
    if (this.scrollTarget && this.scrollTarget !== window) {
      this.scrollTarget.removeEventListener("scroll", this.handleWindowScroll, true);
    }

    this.scrollTarget = null;
  }

  private scheduleAnimationFrameUpdate(oldState: EditorState | null) {
    if (this.animationFrame !== null) {
      window.cancelAnimationFrame(this.animationFrame);
    }

    this.animationFrame = window.requestAnimationFrame(() => {
      this.animationFrame = null;
      void this.updatePosition(oldState);
    });
  }

  private scheduleUpdate(oldState: EditorState | null) {
    const delay = this.getProps().updateDelay ?? 0;

    if (!delay) {
      this.clearUpdateTimer();
      void this.updatePosition(oldState);
      return;
    }

    this.clearUpdateTimer();
    this.updateTimer = window.setTimeout(() => {
      this.updateTimer = null;
      void this.updatePosition(oldState);
    }, delay);
  }

  private scheduleResizeUpdate(oldState: EditorState | null) {
    const delay = this.getProps().resizeDelay ?? 0;

    if (!delay) {
      this.clearResizeTimer();
      void this.updatePosition(oldState);
      return;
    }

    this.clearResizeTimer();
    this.resizeTimer = window.setTimeout(() => {
      this.resizeTimer = null;
      void this.updatePosition(oldState);
    }, delay);
  }

  private clearUpdateTimer() {
    if (this.updateTimer !== null) {
      window.clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private clearResizeTimer() {
    if (this.resizeTimer !== null) {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
  }

  private ensureAppendTarget() {
    const target = resolveAppendTarget(this.getProps().appendTo, this.element);

    if (this.element.parentElement !== target) {
      target.appendChild(this.element);
    }
  }

  private hideElement() {
    this.element.style.position = DEFAULT_STRATEGY;
    this.element.style.left = "0";
    this.element.style.top = "0";
    this.element.style.transform = "translate3d(0, 0, 0)";
    this.element.style.visibility = "hidden";
    this.element.style.pointerEvents = "none";
  }

  private show(context: BubbleMenuVisibilityContextWithEditor) {
    if (this.visible) {
      return;
    }

    this.visible = true;
    const props = this.getProps();

    props.options?.onShow?.();
    props.onShow?.(context);
  }

  private hide(context: BubbleMenuVisibilityContextWithEditor) {
    if (!this.visible) {
      this.hideElement();
      return;
    }

    this.visible = false;
    this.hideElement();
    const props = this.getProps();

    props.options?.onHide?.();
    props.onHide?.(context);
  }

  private async updatePosition(oldState: EditorState | null) {
    if (this.destroyed) {
      return;
    }

    this.ensureAppendTarget();

    const props = this.getProps();
    const context = createMenuVisibilityContext(this.editor, oldState);

    if (!this.view.dom.isConnected) {
      this.hide(context);
      return;
    }

    const shouldShow = props.shouldShow
      ? props.shouldShow(context)
      : defaultShouldShow(this.editor, this.view);

    if (!shouldShow) {
      this.hide(context);
      return;
    }

    const reference = props.getReferencedVirtualElement?.()
      ?? (() => {
        const rect = getSelectionRect(this.view);

        return rect
          ? createReferenceFromRect(rect, this.view.dom)
          : null;
      })();

    if (!reference) {
      this.hide(context);
      return;
    }

    const token = ++this.positionToken;
    const floatingOptions = props.options ?? {};
    const { x, y, strategy } = await computePosition(reference, this.element, {
      middleware: createMiddleware(floatingOptions),
      placement: floatingOptions.placement ?? DEFAULT_PLACEMENT,
      strategy: floatingOptions.strategy ?? DEFAULT_STRATEGY,
    });

    if (this.destroyed || token !== this.positionToken) {
      return;
    }

    this.element.style.position = strategy;
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
    this.element.style.transform = "translate3d(0, 0, 0)";
    this.element.style.visibility = "visible";
    this.element.style.pointerEvents = "auto";

    this.show(context);
    floatingOptions.onUpdate?.();
    props.onUpdate?.(context);
  }
}

export function BubbleMenuPlugin(props: BubbleMenuPluginConfig) {
  const pluginKey = resolvePluginKey(props.pluginKey);

  return new Plugin({
    key: pluginKey,
    view: (view) => new BubbleMenuView(view, {
      ...props,
      pluginKey,
    }),
  });
}
