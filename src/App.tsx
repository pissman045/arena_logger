import { useMemo, useState } from "react";
import { parseBattleTime } from "./lib/battleTime";
import { createCsv } from "./lib/csv";
import { createRegionPreviews, type RegionPreview } from "./lib/imageRegions";
import {
  recognizeResultText,
  recognizeCharacterNames,
  recognizeUserNames,
  type CharacterNameOcrItem,
  type ResultOcrOutput,
  type UserNameOcrOutput,
} from "./lib/ocr";
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
  const [resultOcr, setResultOcr] = useState<ResultOcrOutput | null>(null);
  const [userNameOcr, setUserNameOcr] = useState<UserNameOcrOutput | null>(null);
  const [characterNameOcr, setCharacterNameOcr] = useState<CharacterNameOcrItem[]>([]);
  const [isRecognizingResult, setIsRecognizingResult] = useState(false);
  const [isRecognizingUserName, setIsRecognizingUserName] = useState(false);
  const [isRecognizingCharacterName, setIsRecognizingCharacterName] = useState(false);

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
                setResultOcr(null);
                setUserNameOcr(null);
                setCharacterNameOcr([]);

                if (nextFiles[0]) {
                  setIsProcessingPreview(true);
                  setPreviews(await createRegionPreviews(nextFiles[0]));
                }
              } catch (caught) {
                setFiles(nextFiles);
                setPreviews([]);
                setResultOcr(null);
                setUserNameOcr(null);
                setCharacterNameOcr([]);
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

        {previews.length > 0 && (
          <section className="ocr-panel" aria-label="OCR デバッグ">
            <div className="panel-heading">
              <h2>OCR</h2>
              <div className="button-group">
                <button
                  type="button"
                  disabled={isRecognizingResult}
                  onClick={async () => {
                    const leftResult = previews.find((preview) => preview.name === "leftResult");
                    const rightResult = previews.find((preview) => preview.name === "rightResult");

                    if (!leftResult || !rightResult) {
                      setError("Win/Lose 領域が見つかりません。");
                      return;
                    }

                    try {
                      setError(null);
                      setIsRecognizingResult(true);
                      setResultOcr(
                        await recognizeResultText(leftResult.dataUrl, rightResult.dataUrl),
                      );
                    } catch (caught) {
                      setResultOcr(null);
                      setError(caught instanceof Error ? caught.message : "OCR failed.");
                    } finally {
                      setIsRecognizingResult(false);
                    }
                  }}
                >
                  {isRecognizingResult ? "実行中" : "Win/Lose OCR"}
                </button>
                <button
                  type="button"
                  disabled={isRecognizingUserName}
                  onClick={async () => {
                    const leftUserName = previews.find(
                      (preview) => preview.name === "leftUserName",
                    );
                    const rightUserName = previews.find(
                      (preview) => preview.name === "rightUserName",
                    );

                    if (!leftUserName || !rightUserName) {
                      setError("ユーザー名領域が見つかりません。");
                      return;
                    }

                    try {
                      setError(null);
                      setIsRecognizingUserName(true);
                      setUserNameOcr(
                        await recognizeUserNames(leftUserName.dataUrl, rightUserName.dataUrl),
                      );
                    } catch (caught) {
                      setUserNameOcr(null);
                      setError(caught instanceof Error ? caught.message : "OCR failed.");
                    } finally {
                      setIsRecognizingUserName(false);
                    }
                  }}
                >
                  {isRecognizingUserName ? "実行中" : "ユーザー名 OCR"}
                </button>
                <button
                  type="button"
                  disabled={isRecognizingCharacterName}
                  onClick={async () => {
                    const characterNames = previews
                      .filter((preview) => /^(left|right)Char[1-6]Name$/.test(preview.name))
                      .map((preview) => ({
                        fieldName: preview.name,
                        image: preview.dataUrl,
                      }));

                    if (characterNames.length !== 12) {
                      setError("キャラ名領域が見つかりません。");
                      return;
                    }

                    try {
                      setError(null);
                      setIsRecognizingCharacterName(true);
                      setCharacterNameOcr(await recognizeCharacterNames(characterNames));
                    } catch (caught) {
                      setCharacterNameOcr([]);
                      setError(caught instanceof Error ? caught.message : "OCR failed.");
                    } finally {
                      setIsRecognizingCharacterName(false);
                    }
                  }}
                >
                  {isRecognizingCharacterName ? "実行中" : "キャラ名 OCR"}
                </button>
              </div>
            </div>
            {resultOcr && (
              <div className="ocr-result-grid">
                <div className="ocr-result-item">
                  <span>leftResult</span>
                  <strong>{resultOcr.leftResult ?? "unknown"}</strong>
                  <code>{resultOcr.leftResultText || "(empty)"}</code>
                </div>
                <div className="ocr-result-item">
                  <span>rightResult</span>
                  <strong>{resultOcr.rightResult ?? "unknown"}</strong>
                  <code>{resultOcr.rightResultText || "(empty)"}</code>
                </div>
              </div>
            )}
            {userNameOcr && (
              <div className="ocr-result-grid">
                <div className="ocr-result-item">
                  <span>leftUserName</span>
                  <strong>{userNameOcr.leftUserName || "unknown"}</strong>
                  <code>{userNameOcr.leftUserNameText || "(empty)"}</code>
                </div>
                <div className="ocr-result-item">
                  <span>rightUserName</span>
                  <strong>{userNameOcr.rightUserName || "unknown"}</strong>
                  <code>{userNameOcr.rightUserNameText || "(empty)"}</code>
                </div>
              </div>
            )}
            {characterNameOcr.length > 0 && (
              <div className="ocr-result-grid character-result-grid">
                {characterNameOcr.map((item) => (
                  <div className="ocr-result-item" key={item.fieldName}>
                    <span>{item.fieldName}</span>
                    <div className="ocr-preprocessed-frame">
                      <img alt="" src={item.preprocessedImage} />
                    </div>
                    <strong>{item.characterName || "unknown"}</strong>
                    <code>{item.text || "(empty)"}</code>
                  </div>
                ))}
              </div>
            )}
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
