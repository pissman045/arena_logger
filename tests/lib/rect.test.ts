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

  it("converts adjusted regions to sample image pixels", () => {
    expect(toPixelRect(extractionRegions.leftChar6Name, sampleImageSize)).toEqual({
      x: 1400,
      y: 2100,
      width: 235,
      height: 100,
    });
    expect(toPixelRect(extractionRegions.leftChar6Damage, sampleImageSize)).toEqual({
      x: 1400,
      y: 1170,
      width: 235,
      height: 770,
    });
    expect(toPixelRect(extractionRegions.leftChar1Name, sampleImageSize)).toEqual({
      x: 270,
      y: 2100,
      width: 235,
      height: 100,
    });
    expect(toPixelRect(extractionRegions.rightResult, sampleImageSize)).toEqual({
      x: 2240,
      y: 900,
      width: 390,
      height: 190,
    });
  });

  it("converts result regions to sample image pixels", () => {
    expect(toPixelRect(extractionRegions.leftResult, sampleImageSize)).toEqual({
      x: 330,
      y: 900,
      width: 390,
      height: 190,
    });
    expect(toPixelRect(extractionRegions.rightResult, sampleImageSize)).toEqual({
      x: 2240,
      y: 900,
      width: 390,
      height: 190,
    });
  });
});
