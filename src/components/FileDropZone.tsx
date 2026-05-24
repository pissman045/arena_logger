import { useState, type DragEvent } from "react";

type FileDropZoneProps = {
  onFilesSelected: (files: File[]) => Promise<void>;
  onError: (message: string) => void;
};

export function FileDropZone({ onFilesSelected, onError }: FileDropZoneProps) {
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  function handleDragOver(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();

    if (event.dataTransfer.types.includes("Files")) {
      event.dataTransfer.dropEffect = "copy";
      setIsDraggingFiles(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>): void {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDraggingFiles(false);
    }
  }

  async function handleDrop(event: DragEvent<HTMLLabelElement>): Promise<void> {
    event.preventDefault();
    setIsDraggingFiles(false);

    const droppedFiles = Array.from(event.dataTransfer.files).filter((file) =>
      ["image/png", "image/jpeg"].includes(file.type),
    );

    if (droppedFiles.length === 0) {
      onError("PNG または JPEG 画像をドロップしてください。");
      return;
    }

    await onFilesSelected(droppedFiles);
  }

  return (
    <label
      className={`drop-zone${isDraggingFiles ? " is-dragging" : ""}`}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        accept="image/png,image/jpeg"
        multiple
        type="file"
        onChange={async (event) => {
          const input = event.currentTarget;
          const nextFiles = Array.from(input.files ?? []);

          await onFilesSelected(nextFiles);
          input.value = "";
        }}
      />
      <span>{isDraggingFiles ? "ここにドロップ" : "画像を選択 / ドロップ"}</span>
    </label>
  );
}
