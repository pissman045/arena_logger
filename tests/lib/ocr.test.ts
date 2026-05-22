import { describe, expect, it } from "vitest";
import {
  inferBattleResults,
  normalizeBattleResult,
  normalizeUserName,
} from "../../src/lib/ocr";

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

describe("inferBattleResults", () => {
  it("uses a readable left result and infers the opposite right result", () => {
    expect(inferBattleResults("Win", "")).toEqual({
      leftResult: "win",
      rightResult: "lose",
    });
    expect(inferBattleResults("Lose", "")).toEqual({
      leftResult: "lose",
      rightResult: "win",
    });
  });

  it("uses a readable right result and infers the opposite left result", () => {
    expect(inferBattleResults("", "win")).toEqual({
      leftResult: "lose",
      rightResult: "win",
    });
    expect(inferBattleResults("", "Lose")).toEqual({
      leftResult: "win",
      rightResult: "lose",
    });
  });

  it("returns null results when neither side is readable", () => {
    expect(inferBattleResults("", "unknown")).toEqual({
      leftResult: null,
      rightResult: null,
    });
  });
});

describe("normalizeUserName", () => {
  it("removes whitespace", () => {
    expect(normalizeUserName("  player   name  ")).toBe("playername");
  });

  it("removes symbols and punctuation", () => {
    expect(normalizeUserName("【先生】!!")).toBe("先生");
  });
});
