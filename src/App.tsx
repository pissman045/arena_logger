import { useMemo, useState } from "react";
import { parseBattleTime } from "./lib/battleTime";
import { createCsv } from "./lib/csv";
import { createRegionPreviews, type RegionPreview } from "./lib/imageRegions";
import type { BattleRecord } from "./types/battle";

function createEmptyRecord(fileName: string): BattleRecord {
  return {
    battleTime: parseBattleTime(fileName),
    left: {
      role: "attack",
      result: null,
      userName: "",
      characters: Array.from({ length: 6 }, () => ({
        characterName: "",
        damage: null,
      })),
    },
    right: {
      role: "defense",
      result: null,
      userName: "",
      characters: Array.from({ length: 6 }, () => ({
        characterName: "",
        damage: null,
      })),
    },
  };
}

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<RegionPreview[]>([]);
  const [isProcessingPreview, setIsProcessingPreview] = useState(false);

  const csv = useMemo(() => {
    if (files.length === 0 || error) {
      return "";
    }

    try {
      return createCsv(files.map((file) => createEmptyRecord(file.name)));
    } catch (caught) {
      return caught instanceof Error ? caught.message : "CSV generation failed.";
    }
  }, [error, files]);

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="workspace-header">
          <div>
            <h1>Arena Logger</h1>
            <p>スクリーンショットから CSV を生成するための作業台です。</p>
          </div>
        </header>

        <label className="drop-zone">
          <input
            accept="image/png,image/jpeg"
            multiple
            type="file"
            onChange={async (event) => {
              const nextFiles = Array.from(event.currentTarget.files ?? []);

              try {
                nextFiles.forEach((file) => parseBattleTime(file.name));
                setFiles(nextFiles);
                setError(null);
                setPreviews([]);

                if (nextFiles[0]) {
                  setIsProcessingPreview(true);
                  setPreviews(await createRegionPreviews(nextFiles[0]));
                }
              } catch (caught) {
                setFiles(nextFiles);
                setPreviews([]);
                setError(caught instanceof Error ? caught.message : "Invalid file.");
              } finally {
                setIsProcessingPreview(false);
              }
            }}
          />
          <span>画像を選択</span>
        </label>

        {files.length > 0 && (
          <section className="file-list" aria-label="選択済み画像">
            {files.map((file) => (
              <div className="file-row" key={`${file.name}-${file.lastModified}`}>
                <span>{file.name}</span>
                <span>{Math.round(file.size / 1024).toLocaleString()} KB</span>
              </div>
            ))}
          </section>
        )}

        {error && <p className="error-message">{error}</p>}

        {(isProcessingPreview || previews.length > 0) && (
          <section className="preview-panel" aria-label="切り出しプレビュー">
            <div className="panel-heading">
              <h2>切り出しプレビュー</h2>
              <span>{isProcessingPreview ? "処理中" : `${previews.length} 領域`}</span>
            </div>
            <div className="preview-grid">
              {previews.map((preview) => (
                <article className="preview-item" key={preview.name}>
                  <div className="preview-image-frame">
                    <img alt="" src={preview.dataUrl} />
                  </div>
                  <div className="preview-meta">
                    <strong>{preview.name}</strong>
                    <span>
                      {preview.rect.x}, {preview.rect.y} / {preview.rect.width}x
                      {preview.rect.height}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="csv-panel">
          <div className="panel-heading">
            <h2>CSV</h2>
            <button
              type="button"
              disabled={!csv || Boolean(error)}
              onClick={() => navigator.clipboard.writeText(csv)}
            >
              コピー
            </button>
          </div>
          <textarea readOnly value={csv} placeholder="CSV はここに表示されます。" />
        </section>
      </section>
    </main>
  );
}
