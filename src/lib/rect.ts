import type { PixelRect, RelativeRect } from "../types/battle";

export function toPixelRect(
  rect: RelativeRect,
  imageSize: { width: number; height: number },
): PixelRect {
  return {
    x: Math.round(rect.x * imageSize.width),
    y: Math.round(rect.y * imageSize.height),
    width: Math.round(rect.width * imageSize.width),
    height: Math.round(rect.height * imageSize.height),
  };
}
