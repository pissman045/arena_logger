import type { BattleRecord, BattleSide } from "../types/battle";

const sideColumns = ["result", "user_name"] as const;

export const tsvHeader = [
  "battle_time",
  ...createSideHeader("attacker"),
  ...createSideHeader("defender"),
];

export function createTsv(records: BattleRecord[]): string {
  return [
    tsvHeader.join("\t"),
    ...[...records]
      .sort((a, b) => a.battleTime.localeCompare(b.battleTime))
      .map((record) => createTsvRow(record).map(escapeTsvValue).join("\t")),
  ].join("\n");
}

function createTsvRow(record: BattleRecord): string[] {
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

function escapeTsvValue(value: string): string {
  return value.replace(/[\t\r\n]/g, " ");
}
