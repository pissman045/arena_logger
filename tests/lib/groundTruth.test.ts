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
        fileName: "シュン__leftChar1Name.png",
        kind: "image",
        dataUrl: "data:image/png;base64,abc",
      },
      {
        fileName: "シュン__leftChar1Name.gt.txt",
        kind: "text",
        text: "シュン\n",
      },
    ]);
  });

  it("uses a fallback name when the character name is empty", () => {
    expect(
      createCharacterNameGroundTruthFiles("ignored.png", [
        {
          fieldName: "rightChar6Name",
          characterName: "",
          preprocessedImage: "data:image/png;base64,xyz",
        },
      ]),
    ).toEqual([
      {
        fileName: "unknown-character__rightChar6Name.png",
        kind: "image",
        dataUrl: "data:image/png;base64,xyz",
      },
      {
        fileName: "unknown-character__rightChar6Name.gt.txt",
        kind: "text",
        text: "\n",
      },
    ]);
  });
});
