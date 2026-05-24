import type { BattleRole } from "../types/battle";

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
  attack: RoleIconSignature;
  defense: RoleIconSignature;
};

type RoleIconSignature = {
  anisotropy: number;
  diagonalCorrelation: number;
};

const roleIconFeatureTargets: RoleIconTemplates = {
  attack: {
    // 剣アイコンは細長く、右上から左下の斜め方向へ伸びる。
    anisotropy: 0.57,
    diagonalCorrelation: -0.57,
  },
  defense: {
    // 盾アイコンは左右対称に近く、細長さや斜め方向の偏りが弱い。
    anisotropy: 0.03,
    diagonalCorrelation: -0.01,
  },
};

export async function recognizeRoleIcons(
  leftRoleIconImage: string,
  rightRoleIconImage: string,
): Promise<RoleIconOutput> {
  const [leftFeatures, rightFeatures] = await Promise.all([
    loadRoleIconFeatures(leftRoleIconImage),
    loadRoleIconFeatures(rightRoleIconImage),
  ]);
  const leftAttackScore = calculateFeatureDistance(leftFeatures, roleIconFeatureTargets.attack);
  const leftDefenseScore = calculateFeatureDistance(leftFeatures, roleIconFeatureTargets.defense);
  const rightAttackScore = calculateFeatureDistance(rightFeatures, roleIconFeatureTargets.attack);
  const rightDefenseScore = calculateFeatureDistance(rightFeatures, roleIconFeatureTargets.defense);

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

async function loadRoleIconFeatures(imageUrl: string): Promise<RoleIconSignature> {
  const image = await loadImage(imageUrl);

  return extractRoleIconFeatures(image);
}

function extractRoleIconFeatures(source: CanvasImageSource): RoleIconSignature {
  // 入力画像を小さな固定サイズへ正規化し、解像度差の影響を抑える。
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  canvas.width = roleIconTemplateSize;
  canvas.height = roleIconTemplateSize;
  context.imageSmoothingEnabled = true;
  context.drawImage(source, 0, 0, roleIconTemplateSize, roleIconTemplateSize);

  // 背景ではなくアイコン本体だけを見るため、暗さと彩度から前景らしさの重みを作る。
  const { data } = context.getImageData(0, 0, roleIconTemplateSize, roleIconTemplateSize);
  const weights = new Float32Array(roleIconTemplateSize * roleIconTemplateSize);
  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;

  for (let index = 0; index < weights.length; index += 1) {
    const offset = index * 4;
    const red = data[offset] ?? 0;
    const green = data[offset + 1] ?? 0;
    const blue = data[offset + 2] ?? 0;
    const weight = calculateForegroundWeight(red, green, blue);

    if (weight <= 0) {
      continue;
    }

    const x = index % roleIconTemplateSize;
    const y = Math.floor(index / roleIconTemplateSize);

    weights[index] = weight;
    totalWeight += weight;
    weightedX += x * weight;
    weightedY += y * weight;
  }

  // 前景が取れない場合は、盾に近い中立的な特徴として扱う。
  if (totalWeight <= 0) {
    return createEmptyRoleIconFeatures();
  }

  // 前景ピクセルの重心を求める。分散や相関はこの重心からのズレで計算する。
  const centerX = weightedX / totalWeight;
  const centerY = weightedY / totalWeight;
  let varianceX = 0;
  let varianceY = 0;
  let covariance = 0;

  for (let index = 0; index < weights.length; index += 1) {
    const weight = weights[index] ?? 0;

    if (weight <= 0) {
      continue;
    }

    const x = index % roleIconTemplateSize;
    const y = Math.floor(index / roleIconTemplateSize);
    const deltaX = x - centerX;
    const deltaY = y - centerY;

    varianceX += deltaX * deltaX * weight;
    varianceY += deltaY * deltaY * weight;
    covariance += deltaX * deltaY * weight;
  }

  // 重み付き分散と共分散に正規化する。
  varianceX /= totalWeight;
  varianceY /= totalWeight;
  covariance /= totalWeight;

  // 分散共分散行列の固有値から、形がどれだけ細長いかを求める。
  // 剣は細長いので値が大きく、盾は面に近いので値が小さい。
  const trace = varianceX + varianceY;
  const discriminant = Math.sqrt((varianceX - varianceY) ** 2 + 4 * covariance ** 2);
  const primaryVariance = (trace + discriminant) / 2;
  const secondaryVariance = (trace - discriminant) / 2;

  return {
    anisotropy:
      primaryVariance + secondaryVariance > 0
        ? (primaryVariance - secondaryVariance) / (primaryVariance + secondaryVariance)
        : 0,
    // 右上から左下へ伸びる剣は負の相関が強く、左右対称な盾は 0 に近い。
    diagonalCorrelation:
      varianceX > 0 && varianceY > 0 ? covariance / Math.sqrt(varianceX * varianceY) : 0,
  };
}

function calculateForegroundWeight(red: number, green: number, blue: number): number {
  const brightness = (red + green + blue) / (255 * 3);
  const saturation = (Math.max(red, green, blue) - Math.min(red, green, blue)) / 255;
  const darkness = clamp((0.96 - brightness) / 0.68, 0, 1);
  const weight = darkness * (0.55 + saturation * 0.45);

  return weight < 0.04 ? 0 : weight;
}

function calculateFeatureDistance(actual: RoleIconSignature, expected: RoleIconSignature): number {
  return (
    Math.abs(actual.anisotropy - expected.anisotropy) +
    Math.abs(actual.diagonalCorrelation - expected.diagonalCorrelation)
  );
}

function createEmptyRoleIconFeatures(): RoleIconSignature {
  return {
    anisotropy: 0,
    diagonalCorrelation: 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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
