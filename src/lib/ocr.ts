import { createWorker, OEM, PSM } from "tesseract.js";

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

type BattleResult = "win" | "lose";

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

    const [leftResultText, rightResultText] = await Promise.all([
      recognizeText(worker, leftResultImage),
      recognizeText(worker, rightResultImage),
    ]);
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

    const [leftUserNameText, rightUserNameText] = await Promise.all([
      recognizeText(worker, leftUserNameImage),
      recognizeText(worker, rightUserNameImage),
    ]);

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
