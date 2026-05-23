import type { BattleRole } from "../types/battle";

const attackTemplateUrl = "/templates/attack.png";
const defenseTemplateUrl = "/templates/defence.png";
const roleIconTemplateSize = 48;

export type RoleIconOutput = {
  leftRole: BattleRole | null;
  rightRole: BattleRole | null;
  leftAttackScore: number;
  leftDefenseScore: number;
  rightAttackScore: number;
  rightDefenseScore: number;
  attackLeftTotalScore: number;
  defenseLeftTotalScore: number;
};

type RoleIconTemplates = {
  attack: Float32Array;
  defense: Float32Array;
};

let roleIconTemplatesPromise: Promise<RoleIconTemplates> | null = null;

export async function recognizeRoleIcons(
  leftRoleIconImage: string,
  rightRoleIconImage: string,
): Promise<RoleIconOutput> {
  const [templates, leftPixels, rightPixels] = await Promise.all([
    loadRoleIconTemplates(),
    loadNormalizedRoleIconPixels(leftRoleIconImage),
    loadNormalizedRoleIconPixels(rightRoleIconImage),
  ]);
  const leftAttackScore = calculateMeanAbsoluteDifference(leftPixels, templates.attack);
  const leftDefenseScore = calculateMeanAbsoluteDifference(leftPixels, templates.defense);
  const rightAttackScore = calculateMeanAbsoluteDifference(rightPixels, templates.attack);
  const rightDefenseScore = calculateMeanAbsoluteDifference(rightPixels, templates.defense);

  return inferBattleRoles({
    leftAttackScore,
    leftDefenseScore,
    rightAttackScore,
    rightDefenseScore,
  });
}

export function inferBattleRoles(scores: {
  leftAttackScore: number;
  leftDefenseScore: number;
  rightAttackScore: number;
  rightDefenseScore: number;
}): RoleIconOutput {
  const attackLeftTotalScore = scores.leftAttackScore + scores.rightDefenseScore;
  const defenseLeftTotalScore = scores.leftDefenseScore + scores.rightAttackScore;
  const leftRole = attackLeftTotalScore <= defenseLeftTotalScore ? "attack" : "defense";

  return {
    leftRole,
    rightRole: invertRole(leftRole),
    ...scores,
    attackLeftTotalScore,
    defenseLeftTotalScore,
  };
}

async function loadRoleIconTemplates(): Promise<RoleIconTemplates> {
  if (!roleIconTemplatesPromise) {
    roleIconTemplatesPromise = (async () => {
      const [attackTemplateImage, defenseTemplateImage] = await Promise.all([
        loadImage(attackTemplateUrl),
        loadImage(defenseTemplateUrl),
      ]);

      return {
        attack: renderNormalizedRoleIconPixels(attackTemplateImage),
        defense: renderNormalizedRoleIconPixels(defenseTemplateImage),
      };
    })();
  }

  return roleIconTemplatesPromise;
}

async function loadNormalizedRoleIconPixels(imageUrl: string): Promise<Float32Array> {
  const image = await loadImage(imageUrl);

  return renderNormalizedRoleIconPixels(image);
}

function renderNormalizedRoleIconPixels(source: CanvasImageSource): Float32Array {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  canvas.width = roleIconTemplateSize;
  canvas.height = roleIconTemplateSize;
  context.imageSmoothingEnabled = true;
  context.drawImage(source, 0, 0, roleIconTemplateSize, roleIconTemplateSize);

  const { data } = context.getImageData(0, 0, roleIconTemplateSize, roleIconTemplateSize);
  const pixels = new Float32Array(roleIconTemplateSize * roleIconTemplateSize);

  for (let index = 0; index < pixels.length; index += 1) {
    const offset = index * 4;
    const red = data[offset] ?? 0;
    const green = data[offset + 1] ?? 0;
    const blue = data[offset + 2] ?? 0;

    pixels[index] = (red + green + blue) / (255 * 3);
  }

  return pixels;
}

function calculateMeanAbsoluteDifference(left: Float32Array, right: Float32Array): number {
  let total = 0;

  for (let index = 0; index < left.length; index += 1) {
    total += Math.abs((left[index] ?? 0) - (right[index] ?? 0));
  }

  return total / left.length;
}

function invertRole(role: BattleRole): BattleRole {
  return role === "attack" ? "defense" : "attack";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}
