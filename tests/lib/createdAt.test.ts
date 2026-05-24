import { describe, expect, it } from "vitest";
import { parseCreatedAt } from "../../src/lib/createdAt";

describe("parseCreatedAt", () => {
  it("normalizes a supported BlueArchive screenshot file name", () => {
    expect(parseCreatedAt("BlueArchive 2026-03-18 192912.png")).toBe("20260318192912");
  });

  it("rejects unsupported file names", () => {
    expect(() => parseCreatedAt("screenshot.png")).toThrow(
      "Invalid battle image file name: screenshot.png",
    );
  });
});
