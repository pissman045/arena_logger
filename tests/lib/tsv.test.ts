import { describe, expect, it } from "vitest";
import { createTsv } from "../../src/lib/tsv";
import type { BattleRecord } from "../../src/types/battle";

describe("createTsv", () => {
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

    const rows = createTsv([record]).split("\n");

    expect(rows[1].startsWith("20260318192912\twin\tattacker\ta1\t10")).toBe(true);
    expect(rows[1]).toContain("\tlose\tdefender\td1\t1");
  });

  it("replaces tabs and line breaks in field values", () => {
    const record: BattleRecord = {
      battleTime: "20260318192912",
      left: {
        role: "attack",
        result: "win",
        userName: "attacker\tname",
        characters: Array.from({ length: 6 }, () => ({
          characterName: "a\nname",
          damage: 1,
        })),
      },
      right: {
        role: "defense",
        result: "lose",
        userName: "defender",
        characters: Array.from({ length: 6 }, () => ({
          characterName: "d",
          damage: 2,
        })),
      },
    };

    expect(createTsv([record])).toContain("attacker name\ta name");
  });
});
