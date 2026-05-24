import type { GroundTruthFile } from "./groundTruth";
import { createTarArchive, type TarEntry } from "./tar";

export async function downloadGroundTruthArchive(
  sourceFileName: string,
  files: GroundTruthFile[],
): Promise<void> {
  const entries: TarEntry[] = [];

  for (const file of files) {
    if (file.kind === "image") {
      entries.push({
        fileName: file.fileName,
        data: new Uint8Array(await (await fetch(file.dataUrl)).arrayBuffer()),
      });
    } else {
      entries.push({
        fileName: file.fileName,
        data: file.text,
      });
    }
  }

  const archive = createTarArchive(entries);
  const archiveBuffer = new ArrayBuffer(archive.byteLength);
  new Uint8Array(archiveBuffer).set(archive);
  const archiveUrl = URL.createObjectURL(new Blob([archiveBuffer], { type: "application/x-tar" }));
  const link = document.createElement("a");

  link.href = archiveUrl;
  link.download = `${sourceFileName.replace(/\.[^.]+$/, "")}-ground-truth.tar`;
  link.click();
  URL.revokeObjectURL(archiveUrl);
}
