import { extractionRegions } from "../constants/extractionRegions";
import type { PixelRect, RelativeRect } from "../types/battle";
import { toPixelRect } from "./rect";

export type RegionPreview = {
  name: string;
  rect: PixelRect;
  dataUrl: string;
};

export async function createRegionPreviews(file: File): Promise<RegionPreview[]> {
  const image = await createImageBitmap(file);

  try {
    return Object.entries(extractionRegions).map(([name, relativeRect]) =>
      createRegionPreview(image, name, relativeRect),
    );
  } finally {
    image.close();
  }
}

function createRegionPreview(
  image: ImageBitmap,
  name: string,
  relativeRect: RelativeRect,
): RegionPreview {
  const rect = toPixelRect(relativeRect, {
    width: image.width,
    height: image.height,
  });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  canvas.width = rect.width;
  canvas.height = rect.height;
  context.drawImage(
    image,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    rect.width,
    rect.height,
  );

  return {
    name,
    rect,
    dataUrl: canvas.toDataURL("image/png"),
  };
}
