import { describe, expect, it } from "vitest";
import { createCharacterNameGroundTruthFiles } from "../../src/lib/groundTruth";

describe("createCharacterNameGroundTruthFiles", () => {
  it("creates paired image and gt text files", () => {
    expect(
      createCharacterNameGroundTruthFiles("BlueArchive 2026-05-23 123456.png", [
        {
          fieldName: "leftChar1Name",
          text: "シュンン",
          characterName: "シュン",
          preprocessedImage: "data:image/png;base64,abc",
        },
      ]),
    ).toEqual([
      {
        fileName: "BlueArchive_2026-05-23_123456-01-leftChar1Name.png",
        kind: "image",
        dataUrl: "data:image/png;base64,abc",
      },
      {
        fileName: "BlueArchive_2026-05-23_123456-01-leftChar1Name.gt.txt",
        kind: "text",
        text: "シュン\n",
      },
    ]);
  });
});
