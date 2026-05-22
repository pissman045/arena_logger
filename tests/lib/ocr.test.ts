import { describe, expect, it } from "vitest";
import { normalizeBattleResult } from "../../src/lib/ocr";

describe("normalizeBattleResult", () => {
  it("normalizes win-like OCR text", () => {
    expect(normalizeBattleResult("Win")).toBe("win");
    expect(normalizeBattleResult("W I N")).toBe("win");
  });

  it("normalizes lose-like OCR text", () => {
    expect(normalizeBattleResult("Lose")).toBe("lose");
    expect(normalizeBattleResult("LOOSE")).toBe("lose");
  });

  it("returns null when the OCR text cannot be mapped", () => {
    expect(normalizeBattleResult("")).toBeNull();
    expect(normalizeBattleResult("in")).toBeNull();
    expect(normalizeBattleResult("unknown")).toBeNull();
  });
});
