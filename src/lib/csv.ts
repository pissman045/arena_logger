import type { BattleRecord, BattleSide } from "../types/battle";

const sideColumns = ["result", "user_name"] as const;

export const csvHeader = [
  "battle_time",
  ...createSideHeader("attacker"),
  ...createSideHeader("defender"),
];

export function createCsv(records: BattleRecord[]): string {
  return [
    csvHeader.join(","),
    ...[...records]
      .sort((a, b) => a.battleTime.localeCompare(b.battleTime))
      .map((record) => createCsvRow(record).map(escapeCsvValue).join(",")),
  ].join("\n");
}

function createCsvRow(record: BattleRecord): string[] {
  const attacker = getSideByRole(record, "attack");
  const defender = getSideByRole(record, "defense");

  return [
    record.battleTime,
    ...serializeSide(attacker),
    ...serializeSide(defender),
  ];
}

function createSideHeader(prefix: "attacker" | "defender"): string[] {
  return [
    ...sideColumns.map((column) => `${prefix}_${column}`),
    ...Array.from({ length: 6 }, (_, index) => [
      `${prefix}_char_${index + 1}_name`,
      `${prefix}_char_${index + 1}_damage`,
    ]).flat(),
  ];
}

function getSideByRole(record: BattleRecord, role: "attack" | "defense"): BattleSide {
  if (record.left.role === role) {
    return record.left;
  }

  if (record.right.role === role) {
    return record.right;
  }

  throw new Error(`Battle side was not found for role: ${role}`);
}

function serializeSide(side: BattleSide): string[] {
  return [
    side.result ?? "",
    side.userName,
    ...side.characters.flatMap((character) => [
      character.characterName,
      character.damage?.toString() ?? "",
    ]),
  ];
}

function escapeCsvValue(value: string): string {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}
