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

export type CharacterNameComparisonItem = {
  fieldName: string;
  preprocessedImage: string;
  jpnText: string;
  jpnCharacterName: string;
  trainedText: string;
  trainedCharacterName: string;
};

export type DamageOcrItem = {
  fieldName: string;
  text: string;
  damage: number | null;
  preprocessedImage: string;
};

type BattleResult = "win" | "lose";

const characterNameOcrScale = 1;
const characterNameRecognitionScale = 2;
const characterNameBrightThreshold = 140;
const characterNameCropPadding = 8;
const characterNameTwoLineMinHeight = 75;
const characterNameLineJoinGap = 2;
const characterNameFinalPadding = 8;
const characterNameBinaryThreshold = 170;
const characterNameBinaryContrast = 1.8;
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
const damageBrightThreshold = 160;
const damageCropPadding = 6;
const damageScale = 3;
const damageWhiteMinChannel = 235;
const damageWhiteMaxSpread = 20;
const characterNameWorkerLanguage = "bluearchive_jpn";
const localTessdataWorkerOptions: Partial<Tesseract.WorkerOptions> = {
  langPath: `${import.meta.env.BASE_URL}tessdata`,
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
  return recognizeCharacterNamesWithLanguage(characterNameImages, [characterNameWorkerLanguage]);
}

export async function compareCharacterNameModels(
  characterNameImages: Array<{ fieldName: string; image: string }>,
): Promise<CharacterNameComparisonItem[]> {
  const preprocessedItems = await Promise.all(
    characterNameImages.map(async ({ fieldName, image }) => ({
      fieldName,
      preprocessedImage: await preprocessCharacterNameImage(image),
    })),
  );
  const [jpnItems, trainedItems] = await Promise.all([
    recognizePreprocessedCharacterNames(preprocessedItems, ["jpn"]),
    recognizePreprocessedCharacterNames(preprocessedItems, [characterNameWorkerLanguage]),
  ]);

  return preprocessedItems.map((item, index) => ({
    fieldName: item.fieldName,
    preprocessedImage: item.preprocessedImage,
    jpnText: jpnItems[index]?.text ?? "",
    jpnCharacterName: jpnItems[index]?.characterName ?? "",
    trainedText: trainedItems[index]?.text ?? "",
    trainedCharacterName: trainedItems[index]?.characterName ?? "",
  }));
}

async function recognizeCharacterNamesWithLanguage(
  characterNameImages: Array<{ fieldName: string; image: string }>,
  languages: string[],
): Promise<CharacterNameOcrItem[]> {
  const preprocessedItems = await Promise.all(
    characterNameImages.map(async ({ fieldName, image }) => ({
      fieldName,
      preprocessedImage: await preprocessCharacterNameImage(image),
    })),
  );

  return recognizePreprocessedCharacterNames(preprocessedItems, languages);
}

async function recognizePreprocessedCharacterNames(
  items: Array<{ fieldName: string; preprocessedImage: string }>,
  languages: string[],
): Promise<CharacterNameOcrItem[]> {
  const worker = await createWorker(languages, OEM.LSTM_ONLY, localTessdataWorkerOptions);

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      tessedit_char_whitelist: characterNameWhitelist,
      user_defined_dpi: "200",
      preserve_interword_spaces: "1",
    });

    const recognizedItems: CharacterNameOcrItem[] = [];

    for (const { fieldName, preprocessedImage } of items) {
      const text = await recognizeText(worker, preprocessedImage);
      const rawCharacterName = normalizeCharacterName(text);
      const characterName = correctCharacterName(rawCharacterName);

      recognizedItems.push({
        fieldName,
        text,
        characterName,
        preprocessedImage,
      });
    }

    return recognizedItems;
  } finally {
    await worker.terminate();
  }
}

export async function recognizeDamageValues(
  damageImages: Array<{ fieldName: string; image: string }>,
): Promise<DamageOcrItem[]> {
  const worker = await createWorker("eng", OEM.LSTM_ONLY);

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_WORD,
      tessedit_char_whitelist: "0123456789,Oo",
      user_defined_dpi: "200",
    });

    const items: DamageOcrItem[] = [];

    for (const { fieldName, image } of damageImages) {
      const preprocessedImage = await preprocessDamageImage(image);
      const text = await recognizeText(worker, preprocessedImage);
      const damage = normalizeDamageValue(text);

      items.push({
        fieldName,
        text,
        damage,
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

export function normalizeDamageValue(text: string): number | null {
  const normalized = text
    .trim()
    .replace(/[Oo]/g, "0")
    .replace(/[^\d]/g, "");

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);

  return Number.isFinite(parsed) ? parsed : null;
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
  const isTwoLine = croppedCanvas.height >= characterNameTwoLineMinHeight;
  const preprocessedCanvas = isTwoLine ? joinTwoLineCharacterNameCanvas(croppedCanvas) : croppedCanvas;
  const scaledPreprocessedCanvas = scaleCanvas(
    preprocessedCanvas,
    characterNameRecognitionScale,
    true,
  );
  const preprocessedContext = scaledPreprocessedCanvas.getContext("2d");

  if (!preprocessedContext) {
    throw new Error("Canvas 2D context is not available.");
  }

  const binaryImageData = createCharacterNameBinaryImageData(
    preprocessedContext.getImageData(
      0,
      0,
      scaledPreprocessedCanvas.width,
      scaledPreprocessedCanvas.height,
    ),
  );

  preprocessedContext.putImageData(binaryImageData, 0, 0);

  const refinedBounds = findDarkPixelBounds(binaryImageData, characterNameBrightThreshold);
  const refinedCanvas = cropCanvasToBounds(
    scaledPreprocessedCanvas,
    refinedBounds,
    isTwoLine ? 0 : characterNameCropPadding * characterNameRecognitionScale,
  );
  const outputCanvas = isTwoLine
    ? addCanvasPadding(refinedCanvas, characterNameFinalPadding * characterNameRecognitionScale)
    : refinedCanvas;

  return outputCanvas.toDataURL("image/png");
}

export async function preprocessDamageImage(dataUrl: string): Promise<string> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  context.drawImage(image, 0, 0);

  const sourceImageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const binaryImageData = removeBorderConnectedWhitePixels(
    createDamageBinaryImageData(sourceImageData),
  );

  context.putImageData(binaryImageData, 0, 0);

  const textBounds = findBrightPixelBounds(binaryImageData, damageBrightThreshold);
  const croppedCanvas = cropCanvasToBounds(canvas, textBounds, damageCropPadding);
  const scaledCanvas = document.createElement("canvas");
  const scaledContext = scaledCanvas.getContext("2d");

  if (!scaledContext) {
    throw new Error("Canvas 2D context is not available.");
  }

  scaledCanvas.width = croppedCanvas.width * damageScale;
  scaledCanvas.height = croppedCanvas.height * damageScale;
  scaledContext.imageSmoothingEnabled = false;
  scaledContext.drawImage(croppedCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

  return scaledCanvas.toDataURL("image/png");
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
    0,
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
    0,
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
  context.drawImage(upperCanvas, 0, canvas.height - upperCanvas.height);
  context.drawImage(
    lowerCanvas,
    upperCanvas.width + characterNameLineJoinGap,
    canvas.height - lowerCanvas.height,
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

function addCanvasPadding(sourceCanvas: HTMLCanvasElement, padding: number): HTMLCanvasElement {
  if (padding <= 0) {
    return sourceCanvas;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  canvas.width = sourceCanvas.width + padding * 2;
  canvas.height = sourceCanvas.height + padding * 2;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(sourceCanvas, padding, padding);

  return canvas;
}

function scaleCanvas(
  sourceCanvas: HTMLCanvasElement,
  scale: number,
  smoothing = false,
): HTMLCanvasElement {
  if (scale === 1) {
    return sourceCanvas;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  canvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
  canvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
  context.imageSmoothingEnabled = smoothing;
  context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

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

function findBrightPixelBounds(imageData: ImageData, threshold: number): PixelBounds | null {
  const { data, width, height } = imageData;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      const alpha = data[index + 3] ?? 255;
      const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
      const brightestChannel = Math.max(red, green, blue);

      if (alpha < 32 || (luminance <= threshold && brightestChannel <= threshold + 20)) {
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

function createDamageBinaryImageData(source: ImageData): ImageData {
  const binary = new ImageData(source.width, source.height);

  for (let index = 0; index < source.data.length; index += 4) {
    const red = source.data[index] ?? 255;
    const green = source.data[index + 1] ?? 255;
    const blue = source.data[index + 2] ?? 255;
    const alpha = source.data[index + 3] ?? 255;
    const brightestChannel = Math.max(red, green, blue);
    const darkestChannel = Math.min(red, green, blue);
    const channelSpread = brightestChannel - darkestChannel;
    const whiteDistance =
      (255 - red) * (255 - red) +
      (255 - green) * (255 - green) +
      (255 - blue) * (255 - blue);
    const value =
      alpha >= 32 &&
      darkestChannel >= damageWhiteMinChannel &&
      channelSpread <= damageWhiteMaxSpread &&
      whiteDistance <= 1600
        ? 255
        : 0;

    binary.data[index] = value;
    binary.data[index + 1] = value;
    binary.data[index + 2] = value;
    binary.data[index + 3] = 255;
  }

  return binary;
}

function createCharacterNameBinaryImageData(source: ImageData): ImageData {
  const binary = new ImageData(source.width, source.height);

  for (let index = 0; index < source.data.length; index += 4) {
    const red = source.data[index] ?? 255;
    const green = source.data[index + 1] ?? 255;
    const blue = source.data[index + 2] ?? 255;
    const alpha = source.data[index + 3] ?? 255;
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
    const contrasted = clamp(
      (luminance - 128) * characterNameBinaryContrast + 128,
      0,
      255,
    );
    const value = alpha < 32 ? 255 : contrasted >= characterNameBinaryThreshold ? 255 : 0;

    binary.data[index] = value;
    binary.data[index + 1] = value;
    binary.data[index + 2] = value;
    binary.data[index + 3] = 255;
  }

  return binary;
}

function removeBorderConnectedWhitePixels(source: ImageData): ImageData {
  const cleaned = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
  const queue: Array<{ x: number; y: number }> = [];
  const seen = new Uint8Array(source.width * source.height);

  const enqueueIfWhite = (x: number, y: number): void => {
    if (x < 0 || x >= cleaned.width || y < 0 || y >= cleaned.height) {
      return;
    }

    const offset = y * cleaned.width + x;

    if (seen[offset]) {
      return;
    }

    seen[offset] = 1;

    if (!binaryPixelIsWhite(cleaned, x, y)) {
      return;
    }

    queue.push({ x, y });
  };

  for (let x = 0; x < cleaned.width; x += 1) {
    enqueueIfWhite(x, 0);
    enqueueIfWhite(x, cleaned.height - 1);
  }

  for (let y = 1; y < cleaned.height - 1; y += 1) {
    enqueueIfWhite(0, y);
    enqueueIfWhite(cleaned.width - 1, y);
  }

  while (queue.length > 0) {
    const point = queue.shift();

    if (!point) {
      continue;
    }

    setBinaryPixel(cleaned, point.x, point.y, 0);
    enqueueIfWhite(point.x - 1, point.y);
    enqueueIfWhite(point.x + 1, point.y);
    enqueueIfWhite(point.x, point.y - 1);
    enqueueIfWhite(point.x, point.y + 1);
  }

  return cleaned;
}

function binaryPixelIsWhite(imageData: ImageData, x: number, y: number): boolean {
  const index = (y * imageData.width + x) * 4;
  return (imageData.data[index] ?? 0) >= 250;
}

function setBinaryPixel(imageData: ImageData, x: number, y: number, value: number): void {
  const index = (y * imageData.width + x) * 4;
  imageData.data[index] = value;
  imageData.data[index + 1] = value;
  imageData.data[index + 2] = value;
  imageData.data[index + 3] = 255;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
