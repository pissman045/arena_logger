import { useState } from "react";
import { characterNames } from "../constants/characterNames";
import { parseCreatedAt } from "../lib/createdAt";
import { createCharacterNameGroundTruthFiles } from "../lib/groundTruth";
import { downloadGroundTruthArchive } from "../lib/groundTruthArchive";
import { createRegionPreviews, type RegionPreview } from "../lib/imageRegions";
import {
  recognizeCharacterNames,
  recognizeDamageValues,
  recognizeResultText,
  recognizeUserNames,
  type CharacterNameOcrItem,
  type DamageOcrItem,
  type ResultOcrOutput,
  type UserNameOcrOutput,
} from "../lib/ocr";
import { recognizeRoleIcons, type RoleIconOutput } from "../lib/roleIcon";
import { FileDropZone } from "./FileDropZone";

type DebugWorkspaceProps = {
  error: string | null;
  setError: (message: string | null) => void;
};

export function DebugWorkspace({ error, setError }: DebugWorkspaceProps) {
  const [debugFiles, setDebugFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<RegionPreview[]>([]);
  const [isProcessingPreview, setIsProcessingPreview] = useState(false);
  const [resultOcr, setResultOcr] = useState<ResultOcrOutput | null>(null);
  const [roleOcr, setRoleOcr] = useState<RoleIconOutput | null>(null);
  const [userNameOcr, setUserNameOcr] = useState<UserNameOcrOutput | null>(null);
  const [characterNameOcr, setCharacterNameOcr] = useState<CharacterNameOcrItem[]>([]);
  const [damageOcr, setDamageOcr] = useState<DamageOcrItem[]>([]);
  const [groundTruthLabels, setGroundTruthLabels] = useState<Record<string, string>>({});
  const [isRecognizingRole, setIsRecognizingRole] = useState(false);
  const [isRecognizingResult, setIsRecognizingResult] = useState(false);
  const [isRecognizingUserName, setIsRecognizingUserName] = useState(false);
  const [isRecognizingCharacterName, setIsRecognizingCharacterName] = useState(false);
  const [isRecognizingDamage, setIsRecognizingDamage] = useState(false);

  async function handleSelectedFiles(nextFiles: File[]): Promise<void> {
    try {
      nextFiles.forEach((file) => parseCreatedAt(file.name));
      setDebugFiles(nextFiles);
      setError(null);
      setPreviews([]);
      setRoleOcr(null);
      setResultOcr(null);
      setUserNameOcr(null);
      setCharacterNameOcr([]);
      setDamageOcr([]);
      setGroundTruthLabels({});

      if (nextFiles[0]) {
        setIsProcessingPreview(true);
        setPreviews(await createRegionPreviews(nextFiles[0]));
      }
    } catch (caught) {
      setDebugFiles(nextFiles);
      setPreviews([]);
      setRoleOcr(null);
      setResultOcr(null);
      setUserNameOcr(null);
      setCharacterNameOcr([]);
      setDamageOcr([]);
      setGroundTruthLabels({});
      setError(caught instanceof Error ? caught.message : "Invalid file.");
    } finally {
      setIsProcessingPreview(false);
    }
  }

  return (
    <>
      <FileDropZone onFilesSelected={handleSelectedFiles} onError={setError} />

      {error && <p className="error-message">{error}</p>}

      {debugFiles.length > 0 && (
        <section className="file-list" aria-label="選択済み画像">
          {debugFiles.map((file) => (
            <div className="file-row" key={`${file.name}-${file.lastModified}`}>
              <span>{file.name}</span>
              <span>{Math.round(file.size / 1024).toLocaleString()} KB</span>
            </div>
          ))}
        </section>
      )}

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
                disabled={isRecognizingRole}
                onClick={async () => {
                  const leftRoleIcon = previews.find((preview) => preview.name === "leftRoleIcon");
                  const rightRoleIcon = previews.find((preview) => preview.name === "rightRoleIcon");
                  const sourceFileName = debugFiles[0]?.name ?? "unknown";

                  if (!leftRoleIcon || !rightRoleIcon) {
                    setError(
                      `${sourceFileName}: leftRoleIcon / rightRoleIcon の切り出しに失敗しました。`,
                    );
                    return;
                  }

                  try {
                    setError(null);
                    setIsRecognizingRole(true);
                    setRoleOcr(await recognizeRoleIcons(leftRoleIcon.dataUrl, rightRoleIcon.dataUrl));
                  } catch (caught) {
                    setRoleOcr(null);
                    const message =
                      caught instanceof Error ? caught.message : "Role icon detection failed.";

                    setError(`${sourceFileName}: 攻撃/防衛判定に失敗しました。 ${message}`);
                  } finally {
                    setIsRecognizingRole(false);
                  }
                }}
              >
                {isRecognizingRole ? "実行中" : "攻撃/防衛判定"}
              </button>
              <button
                type="button"
                disabled={isRecognizingDamage}
                onClick={async () => {
                  const damageImages = previews
                    .filter((preview) => /^(left|right)Char[1-6]Damage$/.test(preview.name))
                    .map((preview) => ({
                      fieldName: preview.name,
                      image: preview.dataUrl,
                    }));
                  const sourceFileName = debugFiles[0]?.name ?? "unknown";

                  if (damageImages.length !== 12) {
                    setError(`${sourceFileName}: ダメージ領域が 12 個そろっていません。`);
                    return;
                  }

                  try {
                    setError(null);
                    setIsRecognizingDamage(true);
                    setDamageOcr(await recognizeDamageValues(damageImages));
                  } catch (caught) {
                    setDamageOcr([]);
                    const message = caught instanceof Error ? caught.message : "OCR failed.";

                    setError(`${sourceFileName}: ダメージ OCR に失敗しました。 ${message}`);
                  } finally {
                    setIsRecognizingDamage(false);
                  }
                }}
              >
                {isRecognizingDamage ? "実行中" : "ダメージ OCR"}
              </button>
              <button
                type="button"
                disabled={isRecognizingResult}
                onClick={async () => {
                  const leftResult = previews.find((preview) => preview.name === "leftResult");
                  const rightResult = previews.find((preview) => preview.name === "rightResult");
                  const sourceFileName = debugFiles[0]?.name ?? "unknown";

                  if (!leftResult || !rightResult) {
                    setError(`${sourceFileName}: leftResult / rightResult 領域が見つかりません。`);
                    return;
                  }

                  try {
                    setError(null);
                    setIsRecognizingResult(true);
                    setResultOcr(await recognizeResultText(leftResult.dataUrl, rightResult.dataUrl));
                  } catch (caught) {
                    setResultOcr(null);
                    const message = caught instanceof Error ? caught.message : "OCR failed.";

                    setError(`${sourceFileName}: Win/Lose OCR に失敗しました。 ${message}`);
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
                  const leftUserName = previews.find((preview) => preview.name === "leftUserName");
                  const rightUserName = previews.find((preview) => preview.name === "rightUserName");
                  const sourceFileName = debugFiles[0]?.name ?? "unknown";

                  if (!leftUserName || !rightUserName) {
                    setError(`${sourceFileName}: leftUserName / rightUserName 領域が見つかりません。`);
                    return;
                  }

                  try {
                    setError(null);
                    setIsRecognizingUserName(true);
                    setUserNameOcr(await recognizeUserNames(leftUserName.dataUrl, rightUserName.dataUrl));
                  } catch (caught) {
                    setUserNameOcr(null);
                    const message = caught instanceof Error ? caught.message : "OCR failed.";

                    setError(`${sourceFileName}: ユーザー名 OCR に失敗しました。 ${message}`);
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
                  const characterNameImages = previews
                    .filter((preview) => /^(left|right)Char[1-6]Name$/.test(preview.name))
                    .map((preview) => ({
                      fieldName: preview.name,
                      image: preview.dataUrl,
                    }));
                  const sourceFileName = debugFiles[0]?.name ?? "unknown";

                  if (characterNameImages.length !== 12) {
                    setError(`${sourceFileName}: キャラ名領域が 12 個そろっていません。`);
                    return;
                  }

                  try {
                    setError(null);
                    setIsRecognizingCharacterName(true);
                    const nextCharacterNameOcr = await recognizeCharacterNames(characterNameImages);

                    setCharacterNameOcr(nextCharacterNameOcr);
                    setGroundTruthLabels(
                      Object.fromEntries(
                        nextCharacterNameOcr.map((item) => [item.fieldName, item.characterName]),
                      ),
                    );
                  } catch (caught) {
                    setCharacterNameOcr([]);
                    setGroundTruthLabels({});
                    const message = caught instanceof Error ? caught.message : "OCR failed.";

                    setError(`${sourceFileName}: キャラ名 OCR に失敗しました。 ${message}`);
                  } finally {
                    setIsRecognizingCharacterName(false);
                  }
                }}
              >
                {isRecognizingCharacterName ? "実行中" : "キャラ名 OCR"}
              </button>
            </div>
          </div>
          {roleOcr && (
            <div className="ocr-result-grid">
              <div className="ocr-result-item">
                <span>leftRoleIcon</span>
                <strong>{roleOcr.leftRole ?? "unknown"}</strong>
                <code>
                  attack {roleOcr.leftAttackScore.toFixed(4)} / defense{" "}
                  {roleOcr.leftDefenseScore.toFixed(4)}
                </code>
              </div>
              <div className="ocr-result-item">
                <span>rightRoleIcon</span>
                <strong>{roleOcr.rightRole ?? "unknown"}</strong>
                <code>
                  attack {roleOcr.rightAttackScore.toFixed(4)} / defense{" "}
                  {roleOcr.rightDefenseScore.toFixed(4)}
                </code>
              </div>
            </div>
          )}
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
            <>
              <div className="panel-actions">
                <button
                  type="button"
                  disabled={characterNameOcr.some(
                    (item) => !groundTruthLabels[item.fieldName]?.trim(),
                  )}
                  onClick={async () => {
                    const sourceFileName = debugFiles[0]?.name ?? "character-names.png";
                    const groundTruthItems = characterNameOcr.map((item) => ({
                      ...item,
                      characterName: groundTruthLabels[item.fieldName]?.trim() ?? "",
                    }));

                    await downloadGroundTruthArchive(
                      sourceFileName,
                      createCharacterNameGroundTruthFiles(sourceFileName, groundTruthItems),
                    );
                  }}
                >
                  学習データDL
                </button>
              </div>
              <datalist id="debug-character-name-options">
                {characterNames.map((characterName) => (
                  <option key={characterName} value={characterName} />
                ))}
              </datalist>
              <div className="ocr-result-grid character-result-grid">
                {characterNameOcr.map((item) => (
                  <div className="ocr-result-item" key={item.fieldName}>
                    <span>{item.fieldName}</span>
                    <div className="ocr-preprocessed-frame">
                      <img alt="" src={item.preprocessedImage} />
                    </div>
                    <strong>{item.characterName || "unknown"}</strong>
                    <code>{item.text || "(empty)"}</code>
                    <label className="ground-truth-label">
                      <span>正解</span>
                      <input
                        list="debug-character-name-options"
                        value={groundTruthLabels[item.fieldName] ?? ""}
                        onChange={(event) => {
                          const { value } = event.currentTarget;

                          setGroundTruthLabels((currentLabels) => ({
                            ...currentLabels,
                            [item.fieldName]: value,
                          }));
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </>
          )}
          {damageOcr.length > 0 && (
            <div className="ocr-result-grid character-result-grid">
              {damageOcr.map((item) => (
                <div className="ocr-result-item" key={item.fieldName}>
                  <span>{item.fieldName}</span>
                  <div className="ocr-preprocessed-frame">
                    <img alt="" src={item.preprocessedImage} />
                  </div>
                  <strong>{item.damage?.toLocaleString() ?? "unknown"}</strong>
                  <code>{item.text || "(empty)"}</code>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
