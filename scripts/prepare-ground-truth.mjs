import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { characterNames } from "../src/constants/characterNames.ts";

const sourceDir = process.argv[2] ?? "data/bluearchive_jpn-ground-truth";
const outputDir = process.argv[3] ?? "data/bluearchive_jpn-ground-truth-clean";

mkdirSync(outputDir, { recursive: true });

const sourceFiles = readdirSync(sourceDir);
const pngFiles = sourceFiles.filter((fileName) => fileName.endsWith(".png")).sort();
const gtTextFiles = sourceFiles.filter((fileName) => fileName.endsWith(".gt.txt")).sort();
const unsupportedFiles = sourceFiles
  .filter((fileName) => !fileName.endsWith(".png") && !fileName.endsWith(".gt.txt"))
  .sort();

const pngBaseNames = new Set(pngFiles.map((fileName) => fileName.replace(/\.png$/, "")));
const gtTextBaseNames = new Set(
  gtTextFiles.map((fileName) => fileName.replace(/\.gt\.txt$/, "")),
);
const completeBaseNames = [...pngBaseNames]
  .filter((baseName) => gtTextBaseNames.has(baseName))
  .sort();
const imageOnlyBaseNames = [...pngBaseNames]
  .filter((baseName) => !gtTextBaseNames.has(baseName))
  .sort();
const textOnlyBaseNames = [...gtTextBaseNames]
  .filter((baseName) => !pngBaseNames.has(baseName))
  .sort();
const labels = new Set();

for (const baseName of completeBaseNames) {
  const imageFileName = `${baseName}.png`;
  const gtTextFileName = `${baseName}.gt.txt`;
  const gtTextPath = join(sourceDir, gtTextFileName);
  const label = readFileSync(gtTextPath, "utf8").trim();

  labels.add(label);
  copyFileSync(join(sourceDir, imageFileName), join(outputDir, imageFileName));
  copyFileSync(gtTextPath, join(outputDir, gtTextFileName));
}

const unknownLabels = [...labels]
  .filter((label) => !characterNames.includes(label))
  .sort();

console.log(`source: ${sourceDir}`);
console.log(`output: ${outputDir}`);
console.log(`images: ${pngFiles.length}`);
console.log(`gt text: ${gtTextFiles.length}`);
console.log(`complete pairs: ${completeBaseNames.length}`);
console.log(`image without gt text: ${imageOnlyBaseNames.length}`);
console.log(`gt text without image: ${textOnlyBaseNames.length}`);
console.log(`unsupported files: ${unsupportedFiles.length}`);
console.log(`unique labels: ${labels.size}`);
console.log(`unknown labels: ${unknownLabels.length}`);

printList("image without gt text", imageOnlyBaseNames);
printList("gt text without image", textOnlyBaseNames);
printList("unsupported files", unsupportedFiles.map((fileName) => basename(fileName)));
printList("unknown labels", unknownLabels);

if (completeBaseNames.length === 0) {
  process.exitCode = 1;
}

if (!existsSync(outputDir)) {
  process.exitCode = 1;
}

function printList(label, values) {
  if (values.length === 0) {
    return;
  }

  console.log(`\n${label}:`);

  for (const value of values) {
    console.log(`- ${value}`);
  }
}
