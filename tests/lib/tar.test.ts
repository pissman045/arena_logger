import { describe, expect, it } from "vitest";
import { createTarArchive } from "../../src/lib/tar";

describe("createTarArchive", () => {
  it("creates a tar archive with file headers and 512-byte blocks", () => {
    const archive = createTarArchive([
      {
        fileName: "sample.gt.txt",
        data: "シュン\n",
      },
    ]);
    const headerText = new TextDecoder().decode(archive.slice(0, 100));

    expect(archive.byteLength % 512).toBe(0);
    expect(headerText).toContain("sample.gt.txt");
    expect(new TextDecoder().decode(archive.slice(512, 512 + 10))).toContain("シュン");
  });
});
