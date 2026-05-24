import { parseBattleTime } from "./battleTime";
import { createRegionPreviews, type RegionPreview } from "./imageRegions";
import {
  recognizeCharacterNames,
  recognizeDamageValues,
  recognizeResultText,
  recognizeUserNames,
} from "./ocr";
import { recognizeRoleIcons } from "./roleIcon";
import type { BattleCharacter, BattleRecord, BattleSide } from "../types/battle";

export type EditableSide = {
  userName: string;
  characterNames: string[];
};

export type CurrentReview = {
  file: File;
  record: BattleRecord;
  left: EditableSide;
  right: EditableSide;
};

type OcrInput = {
  fieldName: string;
  image: string;
};

function createEmptyCharacters(): BattleCharacter[] {
  return Array.from({ length: 6 }, () => ({
    characterName: "",
    damage: null,
  }));
}

function createSide(): BattleSide {
  return {
    role: null,
    result: null,
    userName: "",
    characters: createEmptyCharacters(),
  };
}

function createEditableSide(side: BattleSide): EditableSide {
  return {
    userName: side.userName,
    characterNames: side.characters.map((character) => character.characterName),
  };
}

export function applyEditableValues(review: CurrentReview): BattleRecord {
  return {
    ...review.record,
    left: {
      ...review.record.left,
      userName: review.left.userName.trim(),
      characters: review.record.left.characters.map((character, index) => ({
        ...character,
        characterName: review.left.characterNames[index]?.trim() ?? "",
      })),
    },
    right: {
      ...review.record.right,
      userName: review.right.userName.trim(),
      characters: review.record.right.characters.map((character, index) => ({
        ...character,
        characterName: review.right.characterNames[index]?.trim() ?? "",
      })),
    },
  };
}

export function reviewHasRequiredValues(review: CurrentReview): boolean {
  return (
    review.left.userName.trim() !== "" &&
    review.right.userName.trim() !== "" &&
    review.left.characterNames.every((name) => name.trim() !== "") &&
    review.right.characterNames.every((name) => name.trim() !== "")
  );
}

function getPreview(previews: RegionPreview[], name: string, fileName: string): RegionPreview {
  const preview = previews.find((item) => item.name === name);

  if (!preview) {
    throw new Error(`${fileName}: ${name} 領域が見つかりません。`);
  }

  return preview;
}

function getPreviewImages(
  previews: RegionPreview[],
  pattern: RegExp,
  expectedCount: number,
  fieldLabel: string,
  fileName: string,
): OcrInput[] {
  const images = previews
    .filter((preview) => pattern.test(preview.name))
    .map((preview) => ({
      fieldName: preview.name,
      image: preview.dataUrl,
    }));

  if (images.length !== expectedCount) {
    throw new Error(`${fileName}: ${fieldLabel} 領域が ${expectedCount} 個そろっていません。`);
  }

  return images;
}

function assignCharacterName(
  characters: BattleCharacter[],
  fieldName: string,
  characterName: string,
): void {
  const match = /^(left|right)Char([1-6])Name$/.exec(fieldName);

  if (!match) {
    return;
  }

  const index = Number.parseInt(match[2] ?? "0", 10) - 1;

  if (characters[index]) {
    characters[index].characterName = characterName;
  }
}

function assignDamage(characters: BattleCharacter[], fieldName: string, damage: number | null): void {
  const match = /^(left|right)Char([1-6])Damage$/.exec(fieldName);

  if (!match) {
    return;
  }

  const index = Number.parseInt(match[2] ?? "0", 10) - 1;

  if (characters[index]) {
    characters[index].damage = damage;
  }
}

export async function recognizeBattleRecord(file: File): Promise<CurrentReview> {
  const previews = await createRegionPreviews(file);
  const leftRoleIcon = getPreview(previews, "leftRoleIcon", file.name);
  const rightRoleIcon = getPreview(previews, "rightRoleIcon", file.name);
  const leftResult = getPreview(previews, "leftResult", file.name);
  const rightResult = getPreview(previews, "rightResult", file.name);
  const leftUserName = getPreview(previews, "leftUserName", file.name);
  const rightUserName = getPreview(previews, "rightUserName", file.name);
  const characterNameImages = getPreviewImages(
    previews,
    /^(left|right)Char[1-6]Name$/,
    12,
    "キャラ名",
    file.name,
  );
  const damageImages = getPreviewImages(
    previews,
    /^(left|right)Char[1-6]Damage$/,
    12,
    "ダメージ",
    file.name,
  );
  const [role, result, userName, characterNameItems, damageItems] = await Promise.all([
    recognizeRoleIcons(leftRoleIcon.dataUrl, rightRoleIcon.dataUrl),
    recognizeResultText(leftResult.dataUrl, rightResult.dataUrl),
    recognizeUserNames(leftUserName.dataUrl, rightUserName.dataUrl),
    recognizeCharacterNames(characterNameImages),
    recognizeDamageValues(damageImages),
  ]);
  const record: BattleRecord = {
    battleTime: parseBattleTime(file.name),
    left: {
      ...createSide(),
      role: role.leftRole,
      result: result.leftResult,
      userName: userName.leftUserName,
    },
    right: {
      ...createSide(),
      role: role.rightRole,
      result: result.rightResult,
      userName: userName.rightUserName,
    },
  };

  for (const item of characterNameItems) {
    assignCharacterName(
      item.fieldName.startsWith("left") ? record.left.characters : record.right.characters,
      item.fieldName,
      item.characterName,
    );
  }

  for (const item of damageItems) {
    assignDamage(
      item.fieldName.startsWith("left") ? record.left.characters : record.right.characters,
      item.fieldName,
      item.damage,
    );
  }

  return {
    file,
    record,
    left: createEditableSide(record.left),
    right: createEditableSide(record.right),
  };
}
