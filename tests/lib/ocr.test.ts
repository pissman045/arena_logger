import { describe, expect, it } from "vitest";
import {
  correctCharacterName,
  inferBattleResults,
  normalizeBattleResult,
  normalizeCharacterName,
  normalizeDamageValue,
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

describe("normalizeCharacterName", () => {
  it("trims and joins multiline character names", () => {
    expect(normalizeCharacterName("  御坂\n  美琴  ")).toBe("御坂美琴");
  });

  it("drops empty lines", () => {
    expect(normalizeCharacterName("\nヒナ\n\n")).toBe("ヒナ");
  });

  it("keeps only supported character-name characters", () => {
    expect(normalizeCharacterName("アルA!?（正月）")).toBe("アル（正月）");
  });
});

describe("normalizeDamageValue", () => {
  it("parses plain numbers", () => {
    expect(normalizeDamageValue("842162")).toBe(842162);
  });

  it("removes commas and symbols", () => {
    expect(normalizeDamageValue("499,832!")).toBe(499832);
  });

  it("treats O as 0", () => {
    expect(normalizeDamageValue("O")).toBe(0);
    expect(normalizeDamageValue("3O5")).toBe(305);
  });

  it("returns null when no digits remain", () => {
    expect(normalizeDamageValue("")).toBeNull();
    expect(normalizeDamageValue("abc")).toBeNull();
  });
});

describe("correctCharacterName", () => {
  it("keeps exact character names", () => {
    expect(correctCharacterName("ユズ")).toBe("ユズ");
  });

  it("corrects OCR output to the closest character name", () => {
    expect(correctCharacterName("シュンン")).toBe("シュン");
  });

  it("keeps distant text unchanged", () => {
    expect(correctCharacterName("カカカカカカ")).toBe("カカカカカカ");
  });
});
