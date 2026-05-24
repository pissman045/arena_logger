import { useEffect, useMemo, useState } from "react";
import { characterNames } from "../constants/characterNames";
import {
  applyEditableValues,
  recognizeBattleRecord,
  reviewHasRequiredValues,
  type CurrentReview,
} from "../lib/battleRecord";
import { parseBattleTime } from "../lib/battleTime";
import { createTsv } from "../lib/tsv";
import type { BattleRecord } from "../types/battle";
import { FileDropZone } from "./FileDropZone";

const includeTsvHeaderStorageKey = "arenaLogger.includeTsvHeader";

type MainWorkspaceProps = {
  error: string | null;
  setError: (message: string | null) => void;
};

export function MainWorkspace({ error, setError }: MainWorkspaceProps) {
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentReview, setCurrentReview] = useState<CurrentReview | null>(null);
  const [records, setRecords] = useState<BattleRecord[]>([]);
  const [isRecognizingCurrentFile, setIsRecognizingCurrentFile] = useState(false);
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState<string | null>(null);
  const [expandedPreviewUrl, setExpandedPreviewUrl] = useState<string | null>(null);
  const [includeTsvHeader, setIncludeTsvHeader] = useState(() => {
    return localStorage.getItem(includeTsvHeaderStorageKey) === "true";
  });

  const tsv = useMemo(() => {
    if (records.length === 0) {
      return "";
    }

    try {
      return createTsv(records, { includeHeader: includeTsvHeader });
    } catch (caught) {
      return caught instanceof Error ? caught.message : "TSV generation failed.";
    }
  }, [includeTsvHeader, records]);

  const currentFile = queuedFiles[currentFileIndex] ?? null;
  const isMainComplete = queuedFiles.length > 0 && currentFileIndex >= queuedFiles.length;
  const canConfirmCurrentReview =
    currentReview !== null && reviewHasRequiredValues(currentReview) && !isRecognizingCurrentFile;
  const reviewTitle =
    currentReview?.file.name ??
    (isRecognizingCurrentFile && currentFile ? currentFile.name : "個別補正");
  const isReviewDisabled = !currentReview || isRecognizingCurrentFile;

  useEffect(() => {
    if (!currentReview) {
      setCurrentPreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(currentReview.file);

    setCurrentPreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [currentReview]);

  useEffect(() => {
    if (!expandedPreviewUrl) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setExpandedPreviewUrl(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expandedPreviewUrl]);

  useEffect(() => {
    localStorage.setItem(includeTsvHeaderStorageKey, includeTsvHeader ? "true" : "false");
  }, [includeTsvHeader]);

  async function processQueuedFile(nextFiles: File[], fileIndex: number): Promise<void> {
    const file = nextFiles[fileIndex];

    if (!file) {
      setCurrentReview(null);
      setCurrentFileIndex(nextFiles.length);
      return;
    }

    try {
      setError(null);
      setCurrentReview(null);
      setIsRecognizingCurrentFile(true);
      setCurrentReview(await recognizeBattleRecord(file));
    } catch (caught) {
      setCurrentReview(null);
      setError(caught instanceof Error ? caught.message : "OCR failed.");
    } finally {
      setIsRecognizingCurrentFile(false);
    }
  }

  async function handleSelectedFiles(nextFiles: File[]): Promise<void> {
    try {
      nextFiles.forEach((file) => parseBattleTime(file.name));
      setQueuedFiles(nextFiles);
      setCurrentFileIndex(0);
      setCurrentReview(null);
      setError(null);

      await processQueuedFile(nextFiles, 0);
    } catch (caught) {
      setQueuedFiles(nextFiles);
      setCurrentFileIndex(0);
      setCurrentReview(null);
      setError(caught instanceof Error ? caught.message : "Invalid file.");
    }
  }

  async function confirmCurrentReview(): Promise<void> {
    if (!currentReview) {
      return;
    }

    const confirmedRecord = applyEditableValues(currentReview);
    const nextIndex = currentFileIndex + 1;

    setRecords((currentRecords) => [...currentRecords, confirmedRecord]);
    setCurrentFileIndex(nextIndex);
    await processQueuedFile(queuedFiles, nextIndex);
  }

  function updateEditableUserName(side: "left" | "right", userName: string): void {
    setCurrentReview((review) =>
      review
        ? {
            ...review,
            [side]: {
              ...review[side],
              userName,
            },
          }
        : review,
    );
  }

  function updateEditableCharacterName(
    side: "left" | "right",
    characterIndex: number,
    characterName: string,
  ): void {
    setCurrentReview((review) => {
      if (!review) {
        return review;
      }

      const nextCharacterNames = [...review[side].characterNames];
      nextCharacterNames[characterIndex] = characterName;

      return {
        ...review,
        [side]: {
          ...review[side],
          characterNames: nextCharacterNames,
        },
      };
    });
  }

  return (
    <>
      <FileDropZone onFilesSelected={handleSelectedFiles} onError={setError} />

      {error && <p className="error-message">{error}</p>}

      {queuedFiles.length > 0 && (
        <section className="queue-panel" aria-label="処理キュー">
          <div className="panel-heading">
            <h2>キュー</h2>
            <span>
              {Math.min(currentFileIndex + 1, queuedFiles.length)} / {queuedFiles.length}
            </span>
          </div>
          <div className="file-list compact-file-list">
            {queuedFiles.map((file, index) => (
              <div
                className={`file-row${index === currentFileIndex ? " is-current" : ""}`}
                key={`${file.name}-${file.lastModified}`}
              >
                <span>{file.name}</span>
                <span>
                  {index < currentFileIndex ? "追加済み" : index === currentFileIndex ? "確認中" : "待機"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {isRecognizingCurrentFile && currentFile && (
        <section className="status-panel" aria-live="polite">
          <strong>{currentFile.name}</strong>
          <span>OCR 実行中</span>
        </section>
      )}

      <section className="review-panel" aria-label="OCR 結果確認">
        <div className="panel-heading">
          <h2>{reviewTitle}</h2>
        </div>
        <datalist id="character-name-options">
          {characterNames.map((characterName) => (
            <option key={characterName} value={characterName} />
          ))}
        </datalist>
        <div className="review-layout">
          <button
            className="current-image-preview"
            type="button"
            disabled={!currentPreviewUrl}
            onClick={() => {
              if (currentPreviewUrl) {
                setExpandedPreviewUrl(currentPreviewUrl);
              }
            }}
          >
            {currentPreviewUrl ? (
              <img alt="" src={currentPreviewUrl} />
            ) : (
              <span>{isRecognizingCurrentFile ? "OCR 実行中" : "画像未選択"}</span>
            )}
          </button>
          <div className="side-edit-grid">
            {(["left", "right"] as const).map((side) => (
              <section className="side-editor" key={side}>
                <h3>{side === "left" ? "左側" : "右側"}</h3>
                <label className="field-label">
                  <span>ユーザー名</span>
                  <input
                    disabled={isReviewDisabled}
                    value={currentReview?.[side].userName ?? ""}
                    onChange={(event) => updateEditableUserName(side, event.currentTarget.value)}
                  />
                </label>
                <div className="character-edit-grid">
                  {Array.from({ length: 6 }, (_, index) => (
                    <label className="field-label" key={`${side}-${index}`}>
                      <span>キャラ {index + 1}</span>
                      <input
                        disabled={isReviewDisabled}
                        list="character-name-options"
                        value={currentReview?.[side].characterNames[index] ?? ""}
                        onChange={(event) =>
                          updateEditableCharacterName(side, index, event.currentTarget.value)
                        }
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
        <div className="panel-actions">
          <button type="button" disabled={!canConfirmCurrentReview} onClick={confirmCurrentReview}>
            TSVに追加
          </button>
        </div>
      </section>

      {expandedPreviewUrl && (
        <div
          className="image-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setExpandedPreviewUrl(null)}
        >
          <button
            className="image-modal-close"
            type="button"
            aria-label="閉じる"
            onClick={() => setExpandedPreviewUrl(null)}
          >
            閉じる
          </button>
          <img alt="" src={expandedPreviewUrl} onClick={(event) => event.stopPropagation()} />
        </div>
      )}

      {isMainComplete && (
        <section className="status-panel">
          <strong>処理完了</strong>
          <span>{records.length} 件を TSV に追加しました。</span>
        </section>
      )}

      <section className="tsv-panel">
        <div className="panel-heading">
          <h2>TSV</h2>
        </div>
        <label className="checkbox-label">
          <input
            checked={includeTsvHeader}
            type="checkbox"
            onChange={(event) => setIncludeTsvHeader(event.currentTarget.checked)}
          />
          <span>ヘッダーを付与</span>
        </label>
        <textarea readOnly value={tsv} placeholder="確認した結果がここに追加されます。" />
        <div className="panel-actions tsv-actions">
          <button type="button" disabled={!tsv} onClick={() => navigator.clipboard.writeText(tsv)}>
            コピー
          </button>
          <button type="button" disabled={!tsv} onClick={() => setRecords([])}>
            クリア
          </button>
        </div>
      </section>
    </>
  );
}
