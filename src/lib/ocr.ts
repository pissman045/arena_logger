import { createWorker, OEM, PSM } from "tesseract.js";

import { characterNames } from "../constants/characterNames";

export type ResultOcrOutput = {
  leftResultText: string;
  leftResult: "win" | "lose" | null;
  rightResultText: string;
  rightResult: "win" | "lose" | null;
};

export type UserNameOcrOutput = {
  leftUserNameText: string;
  leftUserName: string;
  rightUserNameText: string;
  rightUserName: string;
};

export type CharacterNameOcrItem = {
  fieldName: string;
  text: string;
  characterName: string;
  preprocessedImage: string;
};

type BattleResult = "win" | "lose";

const characterNameOcrScale = 1;
const characterNameBrightThreshold = 140;
const characterNameCropPadding = 8;
const characterNameTwoLineMinHeight = 75;
const characterNameLineJoinGap = 4;
const characterNameWhitelist =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ" +
  "マミムメモヤユヨラリルレロワヲン" +
  "ァィゥェォッャュョヴヵヶー" +
  "（）＊" +
  "制服正月水着臨戦応援団私服温泉幼女体操服御坂美琴初音食蜂操折佐天涙子";
const characterNameAllowedPattern = new RegExp(
  `[^${escapeCharacterClass(characterNameWhitelist)}]`,
  "gu",
);
const characterNameWorkerLanguage = "bluearchive_jpn";
const localTessdataWorkerOptions: Partial<Tesseract.WorkerOptions> = {
  langPath: "/tessdata",
  gzip: false,
};

export async function recognizeResultText(
  leftResultImage: string,
  rightResultImage: string,
): Promise<ResultOcrOutput> {
  const worker = await createWorker("eng", OEM.LSTM_ONLY);

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_WORD,
      tessedit_char_whitelist: "WwIiNnLlOoSsEe",
    });

    const leftResultText = await recognizeText(worker, leftResultImage);
    const rightResultText = await recognizeText(worker, rightResultImage);
    const results = inferBattleResults(leftResultText, rightResultText);

    return {
      leftResultText,
      leftResult: results.leftResult,
      rightResultText,
      rightResult: results.rightResult,
    };
  } finally {
    await worker.terminate();
  }
}

export function inferBattleResults(
  leftResultText: string,
  rightResultText: string,
): {
  leftResult: BattleResult | null;
  rightResult: BattleResult | null;
} {
  const leftResult = normalizeBattleResult(leftResultText);

  if (leftResult) {
    return {
      leftResult,
      rightResult: invertBattleResult(leftResult),
    };
  }

  const rightResult = normalizeBattleResult(rightResultText);

  if (rightResult) {
    return {
      leftResult: invertBattleResult(rightResult),
      rightResult,
    };
  }

  return {
    leftResult: null,
    rightResult: null,
  };
}

export function normalizeBattleResult(text: string): BattleResult | null {
  const normalized = text.toLowerCase().replace(/[^a-z]/g, "");

  if (normalized.includes("win")) {
    return "win";
  }

  if (normalized.includes("lose") || normalized.includes("loose")) {
    return "lose";
  }

  return null;
}

export async function recognizeUserNames(
  leftUserNameImage: string,
  rightUserNameImage: string,
): Promise<UserNameOcrOutput> {
  const worker = await createWorker(["jpn", "eng"], OEM.LSTM_ONLY);

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    });

    const leftUserNameText = await recognizeText(worker, leftUserNameImage);
    const rightUserNameText = await recognizeText(worker, rightUserNameImage);

    return {
      leftUserNameText,
      leftUserName: normalizeUserName(leftUserNameText),
      rightUserNameText,
      rightUserName: normalizeUserName(rightUserNameText),
    };
  } finally {
    await worker.terminate();
  }
}

export function normalizeUserName(text: string): string {
  return text
    .trim()
    .replace(/[\p{P}\p{S}]/gu, "")
    .replace(/\s+/g, "");
}

export async function recognizeCharacterNames(
  characterNameImages: Array<{ fieldName: string; image: string }>,
): Promise<CharacterNameOcrItem[]> {
  const worker = await createWorker(
    [characterNameWorkerLanguage],
    OEM.LSTM_ONLY,
    localTessdataWorkerOptions,
  );

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      tessedit_char_whitelist: characterNameWhitelist,
      user_defined_dpi: "200",
      preserve_interword_spaces: "1",
    });

    const items: CharacterNameOcrItem[] = [];

    for (const { fieldName, image } of characterNameImages) {
      const preprocessedImage = await preprocessCharacterNameImage(image);
      const text = await recognizeText(worker, preprocessedImage);
      const rawCharacterName = normalizeCharacterName(text);
      const characterName = correctCharacterName(rawCharacterName);

      items.push({
        fieldName,
        text,
        characterName,
        preprocessedImage,
      });
    }

    return items;
  } finally {
    await worker.terminate();
  }
}

export function normalizeCharacterName(text: string): string {
  return text
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("")
    .replace(characterNameAllowedPattern, "");
}

export function correctCharacterName(text: string): string {
  const normalized = normalizeCharacterName(text);

  if (!normalized) {
    return "";
  }

  if (characterNames.includes(normalized)) {
    return normalized;
  }

  let bestName = normalized;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const characterName of characterNames) {
    const normalizedCandidate = normalizeCharacterName(characterName);
    const distance = calculateLevenshteinDistance(normalized, normalizedCandidate);
    const score = distance / Math.max(normalized.length, normalizedCandidate.length);

    if (score > bestScore || (score === bestScore && distance >= bestDistance)) {
      continue;
    }

    bestName = characterName;
    bestDistance = distance;
    bestScore = score;
  }

  return bestScore <= 0.67 ? bestName : normalized;
}

function calculateLevenshteinDistance(left: string, right: string): number {
  const leftCharacters = [...left];
  const rightCharacters = [...right];
  const previous = Array.from({ length: rightCharacters.length + 1 }, (_, index) => index);
  const current = new Array<number>(rightCharacters.length + 1);

  for (let leftIndex = 1; leftIndex <= leftCharacters.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= rightCharacters.length; rightIndex += 1) {
      const substitutionCost =
        leftCharacters[leftIndex - 1] === rightCharacters[rightIndex - 1] ? 0 : 1;

      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[rightCharacters.length] ?? 0;
}

export async function preprocessCharacterNameImage(dataUrl: string): Promise<string> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  canvas.width = image.naturalWidth * characterNameOcrScale;
  canvas.height = image.naturalHeight * characterNameOcrScale;
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const bounds = findDarkPixelBounds(imageData, characterNameBrightThreshold);
  const croppedCanvas = cropCanvasToBounds(canvas, bounds, characterNameCropPadding);
  const preprocessedCanvas =
    croppedCanvas.height >= characterNameTwoLineMinHeight
      ? joinTwoLineCharacterNameCanvas(croppedCanvas)
      : croppedCanvas;

  return preprocessedCanvas.toDataURL("image/png");
}

function joinTwoLineCharacterNameCanvas(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const upperHeight = Math.floor(sourceCanvas.height / 2);
  const lowerHeight = sourceCanvas.height - upperHeight;
  const upperCanvas = cropCanvasToDarkPixels(
    cropCanvasToBounds(
      sourceCanvas,
      {
        left: 0,
        top: 0,
        right: sourceCanvas.width - 1,
        bottom: upperHeight - 1,
      },
      0,
    ),
    characterNameCropPadding,
  );
  const lowerCanvas = cropCanvasToDarkPixels(
    cropCanvasToBounds(
      sourceCanvas,
      {
        left: 0,
        top: upperHeight,
        right: sourceCanvas.width - 1,
        bottom: sourceCanvas.height - 1,
      },
      0,
    ),
    characterNameCropPadding,
  );

  if (upperCanvas === null || lowerCanvas === null) {
    return sourceCanvas;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  canvas.width = upperCanvas.width + characterNameLineJoinGap + lowerCanvas.width;
  canvas.height = Math.max(upperCanvas.height, lowerCanvas.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(upperCanvas, 0, Math.floor((canvas.height - upperCanvas.height) / 2));
  context.drawImage(
    lowerCanvas,
    upperCanvas.width + characterNameLineJoinGap,
    Math.floor((canvas.height - lowerCanvas.height) / 2),
  );

  return canvas;
}

function cropCanvasToDarkPixels(
  sourceCanvas: HTMLCanvasElement,
  padding: number,
): HTMLCanvasElement | null {
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Canvas 2D context is not available.");
  }

  const imageData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const bounds = findDarkPixelBounds(imageData, characterNameBrightThreshold);

  if (!bounds) {
    return null;
  }

  return cropCanvasToBounds(sourceCanvas, bounds, padding);
}

function cropCanvasToBounds(
  sourceCanvas: HTMLCanvasElement,
  bounds: PixelBounds | null,
  padding: number,
): HTMLCanvasElement {
  if (!bounds) {
    return sourceCanvas;
  }

  const left = Math.max(0, bounds.left - padding);
  const top = Math.max(0, bounds.top - padding);
  const right = Math.min(sourceCanvas.width - 1, bounds.right + padding);
  const bottom = Math.min(sourceCanvas.height - 1, bounds.bottom + padding);
  const width = right - left + 1;
  const height = bottom - top + 1;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(sourceCanvas, left, top, width, height, 0, 0, width, height);

  return canvas;
}

type PixelBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function findDarkPixelBounds(imageData: ImageData, threshold: number): PixelBounds | null {
  const { data, width, height } = imageData;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const red = data[index] ?? 255;
      const green = data[index + 1] ?? 255;
      const blue = data[index + 2] ?? 255;
      const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;

      if (luminance >= threshold) {
        continue;
      }

      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) {
    return null;
  }

  return {
    left,
    top,
    right,
    bottom,
  };
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();

  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("OCR image preprocessing failed."));
    image.src = src;
  });
}

function escapeCharacterClass(value: string): string {
  return value.replace(/[\\\]^~-]/g, "\\$&");
}

function invertBattleResult(result: BattleResult): BattleResult {
  return result === "win" ? "lose" : "win";
}

async function recognizeText(
  worker: Tesseract.Worker,
  image: string,
): Promise<string> {
  const result = await worker.recognize(image);
  return result.data.text.trim();
}
