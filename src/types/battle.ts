export type BattleRole = "attack" | "defense";

export type BattleResult = "win" | "lose";

export type BattleCharacter = {
  characterName: string;
  damage: number | null;
};

export type BattleSide = {
  role: BattleRole | null;
  result: BattleResult | null;
  userName: string;
  characters: BattleCharacter[];
};

export type BattleRecord = {
  createdAt: string;
  left: BattleSide;
  right: BattleSide;
};

export type RelativeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PixelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ExtractionError = {
  fileName: string;
  field: string;
  message: string;
};
