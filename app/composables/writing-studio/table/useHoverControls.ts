import type { Editor } from "@tiptap/vue-3";
import type { Ref } from "vue";

// 悬浮控制条方向
export type WritingStudioTableHoverAxis = "row" | "column";

// 悬浮控制条位置信息
export type WritingStudioTableHoverControl = {
  axis: WritingStudioTableHoverAxis;
  table: HTMLTableElement;
  top: number;
  left: number;
  width: number;
  height: number;
};

// 表格边缘命中与控件尺寸参数
const TABLE_EDGE_THRESHOLD = 18;
const TABLE_EDGE_OUTSIDE_THRESHOLD = 28;
const TABLE_CONTROL_GAP = 0;
const TABLE_CONTROL_SIZE = 24;
const TABLE_CONTROL_SAFE_MARGIN = 12;

// 根据事件目标定位表格 wrapper 与 table 元素
const resolveTableElements = (target: EventTarget | null, editorRoot: HTMLElement) => {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const tableWrapper = target.closest(".tableWrapper") as HTMLElement | null;
  if (!tableWrapper || !editorRoot.contains(tableWrapper)) {
    return null;
  }

  const table = tableWrapper.querySelector("table") as HTMLTableElement | null;
  if (!table) {
    return null;
  }

  return {
    table,
    tableWrapper,
  };
};

// 按方向生成悬浮控制条几何信息
const createTableHoverControl = (
  axis: WritingStudioTableHoverAxis,
  table: HTMLTableElement,
  container: HTMLElement,
) => {
  const tableRect = table.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  if (axis === "column") {
    return {
      axis,
      table,
      top: tableRect.top - containerRect.top,
      left: tableRect.right - containerRect.left + TABLE_CONTROL_GAP,
      width: TABLE_CONTROL_SIZE,
      height: tableRect.height,
    } satisfies WritingStudioTableHoverControl;
  }

  return {
    axis,
    table,
    top: tableRect.bottom - containerRect.top + TABLE_CONTROL_GAP,
    left: tableRect.left - containerRect.left,
    width: tableRect.width,
    height: TABLE_CONTROL_SIZE,
  } satisfies WritingStudioTableHoverControl;
};

// 根据鼠标位置判断当前悬浮的是列控制还是行控制
const resolveTableHoverAxis = (event: MouseEvent, table: HTMLTableElement) => {
  const rect = table.getBoundingClientRect();
  const isWithinVerticalBand = event.clientY >= rect.top && event.clientY <= rect.bottom;
  const isWithinHorizontalBand = event.clientX >= rect.left && event.clientX <= rect.right;
  const distanceToRight = Math.abs(rect.right - event.clientX);
  const distanceToBottom = Math.abs(rect.bottom - event.clientY);

  const nearRight = isWithinVerticalBand
    && event.clientX >= rect.right - TABLE_EDGE_THRESHOLD
    && event.clientX <= rect.right + TABLE_EDGE_OUTSIDE_THRESHOLD;

  const nearBottom = isWithinHorizontalBand
    && event.clientY >= rect.bottom - TABLE_EDGE_THRESHOLD
    && event.clientY <= rect.bottom + TABLE_EDGE_OUTSIDE_THRESHOLD;

  if (!nearRight && !nearBottom) {
    return null;
  }

  if (nearRight && nearBottom) {
    return distanceToRight <= distanceToBottom ? "column" : "row";
  }

  return nearRight ? "column" : "row";
};

// 判断鼠标是否仍在控件安全区域内
const isPointerWithinControl = (
  event: MouseEvent,
  control: WritingStudioTableHoverControl | null,
  container: HTMLElement,
) => {
  if (!control) {
    return false;
  }

  const containerRect = container.getBoundingClientRect();
  const pointerX = event.clientX - containerRect.left;
  const pointerY = event.clientY - containerRect.top;
  const minX = control.left - TABLE_CONTROL_SAFE_MARGIN;
  const maxX = control.left + control.width + TABLE_CONTROL_SAFE_MARGIN;
  const minY = control.top - TABLE_CONTROL_SAFE_MARGIN;
  const maxY = control.top + control.height + TABLE_CONTROL_SAFE_MARGIN;

  return pointerX >= minX
    && pointerX <= maxX
    && pointerY >= minY
    && pointerY <= maxY;
};

// 将 DOM 单元格转换为编辑器位置
const resolveCellSelectionPos = (
  editor: Editor,
  cell: HTMLTableCellElement,
) => {
  const target = cell.firstElementChild ?? cell;

  try {
    return editor.view.posAtDOM(target, 0);
  } catch {
    return null;
  }
};

// 表格右侧/底部悬浮新增控制逻辑
export const useWritingStudioTableHoverControls = (
  editor: Ref<Editor | null | undefined>,
  containerRef: Ref<HTMLElement | null>,
) => {
  // 当前激活的悬浮控制条
  const activeControl = ref<WritingStudioTableHoverControl | null>(null);
  // 鼠标是否停留在控制条上
  const isControlHovered = ref(false);

  // 清理控制条（鼠标仍在控件时不清理）
  const clearActiveControl = () => {
    if (isControlHovered.value) {
      return;
    }

    activeControl.value = null;
  };

  // 在滚动/缩放后刷新控件位置
  const refreshActiveControl = () => {
    const container = containerRef.value;
    const control = activeControl.value;

    if (!container || !control || !control.table.isConnected) {
      activeControl.value = null;
      return;
    }

    activeControl.value = createTableHoverControl(control.axis, control.table, container);
  };

  // 在表格末尾插入列
  const addColumnAtEnd = () => {
    const currentEditor = editor.value;
    const table = activeControl.value?.table;
    const firstRow = table?.rows.item(0);
    const targetCell = firstRow?.cells.item(firstRow.cells.length - 1);

    if (!currentEditor || !table || !targetCell) {
      return false;
    }

    const pos = resolveCellSelectionPos(currentEditor, targetCell);
    if (typeof pos !== "number") {
      return false;
    }

    const success = (currentEditor.chain().focus().setTextSelection(pos) as any).addColumnAfter().run();
    if (success) {
      activeControl.value = null;
    }

    return success;
  };

  // 在表格末尾插入行
  const addRowAtEnd = () => {
    const currentEditor = editor.value;
    const table = activeControl.value?.table;
    const lastRow = table?.rows.item(table.rows.length - 1);
    const targetCell = lastRow?.cells.item(0);

    if (!currentEditor || !table || !targetCell) {
      return false;
    }

    const pos = resolveCellSelectionPos(currentEditor, targetCell);
    if (typeof pos !== "number") {
      return false;
    }

    const success = (currentEditor.chain().focus().setTextSelection(pos) as any).addRowAfter().run();
    if (success) {
      activeControl.value = null;
    }

    return success;
  };

  // 根据当前轴向执行新增操作
  const activateCurrentControl = () => {
    if (activeControl.value?.axis === "column") {
      return addColumnAtEnd();
    }

    if (activeControl.value?.axis === "row") {
      return addRowAtEnd();
    }

    return false;
  };

  // 控制条 hover 状态维护
  const handleControlMouseEnter = () => {
    isControlHovered.value = true;
  };

  const handleControlMouseLeave = () => {
    isControlHovered.value = false;
  };

  // 监听鼠标、滚动、窗口尺寸变化来驱动控件显示
  watch([editor, containerRef], ([currentEditor, container], _oldValue, onCleanup) => {
    activeControl.value = null;

    if (!currentEditor || !container) {
      return;
    }

    const editorRoot = currentEditor.view.dom as HTMLElement;

    const handleMouseMove = (event: MouseEvent) => {
      if (!container.isConnected) {
        activeControl.value = null;
        return;
      }

      if (isPointerWithinControl(event, activeControl.value, container)) {
        return;
      }

      const tableElements = resolveTableElements(event.target, editorRoot);
      if (!tableElements) {
        clearActiveControl();
        return;
      }

      const axis = resolveTableHoverAxis(event, tableElements.table);
      if (!axis) {
        clearActiveControl();
        return;
      }

      activeControl.value = createTableHoverControl(axis, tableElements.table, container);
    };

    const handleMouseLeave = () => {
      clearActiveControl();
    };

    const handleScrollOrResize = () => {
      refreshActiveControl();
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    onCleanup(() => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    });
  }, {
    immediate: true,
  });

  return {
    activeControl,
    activateCurrentControl,
    clearActiveControl,
    handleControlMouseEnter,
    handleControlMouseLeave,
  };
};
