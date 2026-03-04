export type CropType = "free" | "1:1" | "16:9" | "circle";

export type BoundsType = "render" | "box";

export interface RectData {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 读取 Leafer 节点在世界坐标中的包围盒。
 * @param target 目标节点
 * @param app Leafer App 实例（通常是 canvas.value）
 * @param type render 或 box
 */
export const getWorldBounds = (target: any, app: any, type: BoundsType = "render"): RectData | null => {
  if (!target) return null;
  return target.getBounds?.(type, app) || target.getBounds?.() || null;
};

/**
 * 读取图形几何矩形（基于 x/y/width/height + scale 计算）。
 * 用于避免 render/bounds 受描边等渲染属性影响。
 */
export const getShapeRect = (shape: any): RectData | null => {
  if (!shape) return null;

  const scaleX = shape.scaleX ?? 1;
  const scaleY = shape.scaleY ?? 1;
  const width = Math.abs((shape.width || 0) * scaleX);
  const height = Math.abs((shape.height || 0) * scaleY);
  if (!width || !height) return null;

  const x = scaleX >= 0 ? shape.x : shape.x - width;
  const y = scaleY >= 0 ? shape.y : shape.y - height;

  return { x, y, width, height };
};

/**
 * 获取引导框矩形：优先几何矩形，兜底 box 包围盒。
 */
export const getGuideRect = (guide: any, app: any): RectData | null => {
  return getShapeRect(guide) || getWorldBounds(guide, app, "box") || null;
};

/**
 * 获取元素中心点（世界坐标）。
 */
export const getWorldCenter = (target: any, app: any): { x: number; y: number } | null => {
  const rect = getWorldBounds(target, app, "render");
  if (!rect) return null;
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
};

/**
 * 将 inner 矩形限制在 outer 矩形内部，仅返回新的 x/y。
 */
export const clampRectToBounds = (inner: RectData, outer: RectData) => {
  let x = inner.x;
  let y = inner.y;

  if (x < outer.x) x = outer.x;
  if (y < outer.y) y = outer.y;
  if (x + inner.width > outer.x + outer.width) x = outer.x + outer.width - inner.width;
  if (y + inner.height > outer.y + outer.height) y = outer.y + outer.height - inner.height;

  return { x, y };
};

/**
 * 读取节点圆角值（兼容 number 和 number[]）。
 */
export const getCornerRadius = (shape: any): number => {
  if (!shape) return 0;
  const raw = shape.cornerRadius;
  return Array.isArray(raw) ? Number(raw[0] || 0) : Number(raw || 0);
};

/**
 * 将圆角百分比转换为像素值。
 * 转换基准：优先当前引导框最短边，其次按主图初始裁剪尺寸推算。
 */
export const radiusPercentToPx = (
  percent: number,
  cropType: CropType,
  guide: any,
  image: any,
  app: any,
): number => {
  if (cropType === "circle") return 0;

  const safePercent = Math.max(0, Math.min(percent, 50));
  const guideRect = getGuideRect(guide, app);
  if (guideRect?.width && guideRect?.height) {
    return (Math.min(guideRect.width, guideRect.height) * safePercent) / 100;
  }

  const imageRect = getWorldBounds(image, app, "render");
  if (!imageRect) return 0;

  const base = Math.min(imageRect.width, imageRect.height) * 0.7;
  const width = base;
  const height = cropType === "16:9" ? (base * 9) / 16 : base;
  return (Math.min(width, height) * safePercent) / 100;
};
