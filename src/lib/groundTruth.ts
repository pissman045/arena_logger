import type { CharacterNameOcrItem } from "./ocr";

export type GroundTruthFile =
  | {
      fileName: string;
      kind: "image";
      dataUrl: string;
    }
  | {
      fileName: string;
      kind: "text";
      text: string;
    };

export function createCharacterNameGroundTruthFiles(
  _sourceFileName: string,
  items: Array<Pick<CharacterNameOcrItem, "fieldName" | "characterName" | "preprocessedImage">>,
): GroundTruthFile[] {
  return items.flatMap((item) => {
    const baseName = [
      sanitizeFileName(item.characterName || "unknown-character"),
      sanitizeFileName(item.fieldName),
    ].join("__");

    return [
      {
        fileName: `${baseName}.png`,
        kind: "image" as const,
        dataUrl: item.preprocessedImage,
      },
      {
        fileName: `${baseName}.gt.txt`,
        kind: "text" as const,
        text: `${item.characterName}\n`,
      },
    ];
  });
}

function sanitizeFileName(value: string): string {
  return (
    value
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N}._-]+/gu, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || "ground-truth"
  );
}
