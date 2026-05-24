import { describe, expect, it } from "vitest";
import { createTsv } from "../../src/lib/tsv";
import type { BattleRecord } from "../../src/types/battle";

describe("createTsv", () => {
  it("serializes battle records with role-based side ordering", () => {
    const record: BattleRecord = {
      createdAt: "20260318192912",
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

    expect(rows[0]).toBe(
      [
        "2026-03-18 19-29-12",
        "true",
        "attacker",
        "defender",
        "a1",
        "a2",
        "a3",
        "a4",
        "a5",
        "a6",
        "d1",
        "d2",
        "d3",
        "d4",
        "d5",
        "d6",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
      ].join("\t"),
    );
  });

  it("adds a header row when requested", () => {
    const record: BattleRecord = {
      createdAt: "20260318192912",
      left: {
        role: "attack",
        result: "win",
        userName: "attacker",
        characters: Array.from({ length: 6 }, () => ({
          characterName: "a",
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

    const rows = createTsv([record], { includeHeader: true }).split("\n");

    expect(rows[0]).toBe(
      [
        "created_at",
        "attacker_win",
        "attacker_user_name",
        "defender_user_name",
        "attacker_char_1",
        "attacker_char_2",
        "attacker_char_3",
        "attacker_char_4",
        "attacker_char_5",
        "attacker_char_6",
        "defender_char_1",
        "defender_char_2",
        "defender_char_3",
        "defender_char_4",
        "defender_char_5",
        "defender_char_6",
        "attacker_char_1_damage",
        "attacker_char_2_damage",
        "attacker_char_3_damage",
        "attacker_char_4_damage",
        "attacker_char_5_damage",
        "attacker_char_6_damage",
        "defender_char_1_damage",
        "defender_char_2_damage",
        "defender_char_3_damage",
        "defender_char_4_damage",
        "defender_char_5_damage",
        "defender_char_6_damage",
      ].join("\t"),
    );
    expect(rows[1].startsWith("2026-03-18 19-29-12\ttrue\tattacker\tdefender")).toBe(true);
  });

  it("serializes attacker loss as false", () => {
    const record: BattleRecord = {
      createdAt: "20260318192912",
      left: {
        role: "attack",
        result: "lose",
        userName: "attacker",
        characters: Array.from({ length: 6 }, () => ({
          characterName: "a",
          damage: 1,
        })),
      },
      right: {
        role: "defense",
        result: "win",
        userName: "defender",
        characters: Array.from({ length: 6 }, () => ({
          characterName: "d",
          damage: 2,
        })),
      },
    };

    expect(createTsv([record]).split("\t")[1]).toBe("false");
  });

  it("replaces tabs and line breaks in field values", () => {
    const record: BattleRecord = {
      createdAt: "20260318192912",
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

    expect(createTsv([record])).toContain("attacker name\tdefender\ta name");
  });
});
