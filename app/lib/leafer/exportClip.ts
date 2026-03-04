import type { CropType, RectData } from "./geometry";

/**
 * 根据引导框与图片包围盒，计算用于图片导出的 clip 参数。
 * 坐标系说明：返回值是相对图片左上角的偏移。
 * @param guideRect 裁剪引导框（世界坐标）
 * @param imageRect 图片渲染包围盒（世界坐标）
 * @param minSize 导出裁剪区域最小边长，避免出现 0
 */
export const getImageClipRectFromGuide = (
  guideRect: RectData,
  imageRect: RectData,
  minSize = 1,
): RectData => {
  const clipX = Math.max(0, guideRect.x - imageRect.x);
  const clipY = Math.max(0, guideRect.y - imageRect.y);
  const clipWidth = Math.max(minSize, Math.min(guideRect.width, imageRect.width - clipX));
  const clipHeight = Math.max(minSize, Math.min(guideRect.height, imageRect.height - clipY));

  return { x: clipX, y: clipY, width: clipWidth, height: clipHeight };
};

/**
 * 从 Leafer export 返回结果中提取 HTMLCanvasElement。
 * 兼容 `data` 本身就是 canvas，或 `data.view` 是 canvas 的场景。
 * @param result topImage.export("canvas") 的返回值
 */
export const resolveExportCanvas = (result: any): HTMLCanvasElement | null => {
  const exportedData = result?.data;
  if (exportedData instanceof HTMLCanvasElement) return exportedData;
  if (exportedData?.view instanceof HTMLCanvasElement) return exportedData.view;
  return null;
};

/**
 * 绘制圆角矩形路径，用于导出阶段的 shape clip。
 * @param ctx Canvas 2D 上下文
 * @param x 路径左上角 x
 * @param y 路径左上角 y
 * @param width 路径宽度
 * @param height 路径高度
 * @param radius 圆角半径（像素）
 * @param epsilon 浮点误差容忍值
 */
export const drawRoundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  epsilon = 0.0001,
) => {
  const safeRadius = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();

  if (safeRadius <= epsilon) {
    ctx.rect(x, y, width, height);
    ctx.closePath();
    return;
  }

  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + safeRadius, safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.arcTo(x + width, y + height, x + width - safeRadius, y + height, safeRadius);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.arcTo(x, y + height, x, y + height - safeRadius, safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.arcTo(x, y, x + safeRadius, y, safeRadius);
  ctx.closePath();
};

/**
 * 根据裁剪类型绘制导出裁剪路径。
 * @param ctx Canvas 2D 上下文
 * @param cropType 裁剪类型（circle / rect）
 * @param width 路径宽度
 * @param height 路径高度
 * @param radiusPx 矩形圆角像素值
 */
export const drawExportShapePath = (
  ctx: CanvasRenderingContext2D,
  cropType: CropType,
  width: number,
  height: number,
  radiusPx: number,
) => {
  if (cropType === "circle") {
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.closePath();
    return;
  }

  drawRoundedRectPath(ctx, 0, 0, width, height, radiusPx);
};

export interface ApplyExportShapeClipOptions {
  cropType: CropType;
  pixelScaleX: number;
  pixelScaleY: number;
  cornerRadiusWorld: number;
  overlayFillStyle?: string | null;
}

/**
 * 对导出的矩形 canvas 再执行一次形状裁剪（圆/圆角矩形），并可补回编辑时的遮罩色。
 * @param source Leafer 导出的原始 canvas（矩形）
 * @param options 裁剪形状参数与遮罩参数
 */
export const applyExportShapeClip = (
  source: HTMLCanvasElement,
  options: ApplyExportShapeClipOptions,
): HTMLCanvasElement => {
  const needsShapeClip = options.cropType === "circle" || options.cornerRadiusWorld > 0 || !!options.overlayFillStyle;
  if (!needsShapeClip) return source;

  const output = document.createElement("canvas");
  output.width = source.width;
  output.height = source.height;

  const ctx = output.getContext("2d");
  if (!ctx) return source;

  const radiusPx = Math.max(0, options.cornerRadiusWorld * Math.min(options.pixelScaleX, options.pixelScaleY));

  ctx.save();
  ctx.clearRect(0, 0, output.width, output.height);
  drawExportShapePath(ctx, options.cropType, output.width, output.height, radiusPx);
  ctx.clip();
  ctx.drawImage(source, 0, 0);

  if (options.overlayFillStyle) {
    ctx.fillStyle = options.overlayFillStyle;
    ctx.fillRect(0, 0, output.width, output.height);
  }

  ctx.restore();
  return output;
};
