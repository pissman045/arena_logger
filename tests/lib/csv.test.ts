import { describe, expect, it } from "vitest";
import { createCsv } from "../../src/lib/csv";
import type { BattleRecord } from "../../src/types/battle";

describe("createCsv", () => {
  it("serializes battle records with role-based side ordering", () => {
    const record: BattleRecord = {
      battleTime: "20260318192912",
      left: {
        role: "defense",
        result: "lose",
        userName: "defender",
        characters: Array.from({ length: 6 }, (_, index) => ({
          characterName: `d${index + 1}`,
          damage: index + 1,
        })),
      },
      right: {
        role: "attack",
        result: "win",
        userName: "attacker",
        characters: Array.from({ length: 6 }, (_, index) => ({
          characterName: `a${index + 1}`,
          damage: index + 10,
        })),
      },
    };

    const rows = createCsv([record]).split("\n");

    expect(rows[1].startsWith("20260318192912,win,attacker,a1,10")).toBe(true);
    expect(rows[1]).toContain(",lose,defender,d1,1");
  });
});
