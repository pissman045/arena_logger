import { describe, expect, it } from "vitest";
import { parseBattleTime } from "../../src/lib/battleTime";

describe("parseBattleTime", () => {
  it("normalizes a supported BlueArchive screenshot file name", () => {
    expect(parseBattleTime("BlueArchive 2026-03-18 192912.png")).toBe("20260318192912");
  });

  it("rejects unsupported file names", () => {
    expect(() => parseBattleTime("screenshot.png")).toThrow(
      "Invalid battle image file name: screenshot.png",
    );
  });
});
