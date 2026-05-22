import { createWorker, OEM, PSM } from "tesseract.js";

export type ResultOcrOutput = {
  leftResultText: string;
  leftResult: "win" | "lose" | null;
  rightResultText: string;
  rightResult: "win" | "lose" | null;
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

    const [leftResultText, rightResultText] = await Promise.all([
      recognizeText(worker, leftResultImage),
      recognizeText(worker, rightResultImage),
    ]);

    return {
      leftResultText,
      leftResult: normalizeBattleResult(leftResultText),
      rightResultText,
      rightResult: normalizeBattleResult(rightResultText),
    };
  } finally {
    await worker.terminate();
  }
}

export function normalizeBattleResult(text: string): "win" | "lose" | null {
  const normalized = text.toLowerCase().replace(/[^a-z]/g, "");

  if (normalized.includes("win")) {
    return "win";
  }

  if (normalized.includes("lose") || normalized.includes("loose")) {
    return "lose";
  }

  return null;
}

async function recognizeText(
  worker: Tesseract.Worker,
  image: string,
): Promise<string> {
  const result = await worker.recognize(image);
  return result.data.text.trim();
}
