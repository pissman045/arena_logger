const createdAtPattern = /^BlueArchive (\d{4})-(\d{2})-(\d{2}) (\d{6})\.png$/;

export function parseCreatedAt(fileName: string): string {
  const match = createdAtPattern.exec(fileName);

  if (!match) {
    throw new Error(`Invalid battle image file name: ${fileName}`);
  }

  const [, year, month, day, time] = match;
  return `${year}${month}${day}${time}`;
}
