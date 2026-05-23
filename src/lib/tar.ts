export type TarEntry = {
  fileName: string;
  data: string | Uint8Array;
};

const blockSize = 512;
const textEncoder = new TextEncoder();

export function createTarArchive(entries: TarEntry[]): Uint8Array {
  const chunks: Uint8Array[] = [];

  for (const entry of entries) {
    const data = typeof entry.data === "string" ? textEncoder.encode(entry.data) : entry.data;
    const header = createTarHeader(entry.fileName, data.byteLength);
    const paddingLength = (blockSize - (data.byteLength % blockSize)) % blockSize;

    chunks.push(header, data);

    if (paddingLength > 0) {
      chunks.push(new Uint8Array(paddingLength));
    }
  }

  chunks.push(new Uint8Array(blockSize), new Uint8Array(blockSize));

  return concatBytes(chunks);
}

function createTarHeader(fileName: string, size: number): Uint8Array {
  const header = new Uint8Array(blockSize);

  writeString(header, 0, 100, fileName);
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, size);
  writeOctal(header, 136, 12, Math.floor(Date.now() / 1000));
  header.fill(0x20, 148, 156);
  header[156] = "0".charCodeAt(0);
  writeString(header, 257, 6, "ustar");
  writeString(header, 263, 2, "00");

  const checksum = header.reduce((sum, value) => sum + value, 0);
  writeOctal(header, 148, 8, checksum);

  return header;
}

function writeString(target: Uint8Array, offset: number, length: number, value: string): void {
  const bytes = textEncoder.encode(value);
  target.set(bytes.slice(0, length), offset);
}

function writeOctal(target: Uint8Array, offset: number, length: number, value: number): void {
  const text = value.toString(8).padStart(length - 1, "0").slice(-(length - 1));

  writeString(target, offset, length - 1, text);
  target[offset + length - 1] = 0;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}
