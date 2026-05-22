import { describe, expect, it } from "vitest";
import { extractionRegions, sampleImageSize } from "../../src/constants/extractionRegions";
import { toPixelRect } from "../../src/lib/rect";

describe("toPixelRect", () => {
  it("converts relative coordinates to sample image pixels", () => {
    expect(toPixelRect(extractionRegions.leftRoleIcon, sampleImageSize)).toEqual({
      x: 160,
      y: 900,
      width: 170,
      height: 170,
    });
  });
});
