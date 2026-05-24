import type { BattleRecord, BattleResult, BattleSide } from "../types/battle";

export const tsvHeader = [
  "created_at",
  "attacker_win",
  "attacker_user_name",
  "defender_user_name",
  ...createCharacterHeaders("attacker"),
  ...createCharacterHeaders("defender"),
  ...createDamageHeaders("attacker"),
  ...createDamageHeaders("defender"),
];

type CreateTsvOptions = {
  includeHeader?: boolean;
};

export function createTsv(records: BattleRecord[], options: CreateTsvOptions = {}): string {
  const rows = [
    ...[...records]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((record) => createTsvRow(record).map(escapeTsvValue).join("\t")),
  ];

  if (options.includeHeader) {
    rows.unshift(tsvHeader.join("\t"));
  }

  return rows.join("\n");
}

function createTsvRow(record: BattleRecord): string[] {
  const attacker = getSideByRole(record, "attack");
  const defender = getSideByRole(record, "defense");

  return [
    formatCreatedAt(record.createdAt),
    serializeAttackerWin(attacker.result),
    attacker.userName,
    defender.userName,
    ...attacker.characters.map((character) => character.characterName),
    ...defender.characters.map((character) => character.characterName),
    ...attacker.characters.map((character) => character.damage?.toString() ?? ""),
    ...defender.characters.map((character) => character.damage?.toString() ?? ""),
  ];
}

function formatCreatedAt(createdAt: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(createdAt);

  if (!match) {
    return createdAt;
  }

  const [, year, month, day, hour, minute, second] = match;

  return `${year}-${month}-${day} ${hour}-${minute}-${second}`;
}

function createCharacterHeaders(prefix: "attacker" | "defender"): string[] {
  return Array.from({ length: 6 }, (_, index) => `${prefix}_char_${index + 1}`);
}

function createDamageHeaders(prefix: "attacker" | "defender"): string[] {
  return Array.from({ length: 6 }, (_, index) => `${prefix}_char_${index + 1}_damage`);
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

function serializeAttackerWin(result: BattleResult | null): string {
  if (result === "win") {
    return "true";
  }

  if (result === "lose") {
    return "false";
  }

  return "";
}

function escapeTsvValue(value: string): string {
  return value.replace(/[\t\r\n]/g, " ");
}
