# Tesseract 学習メモ

## 方針

キャラ名 OCR は、アプリから書き出した ground truth を使って `bluearchive_jpn.traineddata` を作る。

このアプリではブラウザ版 `tesseract.js` から `/tessdata/bluearchive_jpn.traineddata` を読む。成果物は `public/tessdata/bluearchive_jpn.traineddata` に配置する。

今回の環境では `jpn.traineddata` からの fine-tuning は `lstmtraining` が segfault したため、`START_MODEL` なしの新規学習で進めた。

## 使用ツール

- Tesseract 4.1.1
- Tesseract training tools
- `tesstrain`
- `make`
- `bash`
- `tar`

`data/` は Git 管理外。ground truth や学習用の一時データは `data/` 以下に置く。

## Ground Truth 作成

アプリで「キャラ名 OCR」を実行し、正解ラベルを確認してから「学習データDL」を押す。

ダウンロードされる `.tar` には、同じ basename の画像と正解テキストが入る。

```text
BlueArchive_2026-05-23_233715-01-leftChar1Name.png
BlueArchive_2026-05-23_233715-01-leftChar1Name.gt.txt
```

正解テキストは 1 行の UTF-8 プレーンテキストにする。

```text
ホシノ（水着）
```

## データ作成ルール

- 正解テキストは `src/constants/characterNames.ts` に含まれる表記と一致させる
- `（` `）` は全角を使う
- `*` ではなく、画面と辞書に合わせて `＊` を使う
- 空白は入れない
- 2 行表示のキャラ名は、アプリ側の OCR 前処理と同じく横 1 行へ連結した画像を使う
- 左右位置、1行/2行、背景、画質が違うサンプルを混ぜる

## tar 展開

ダウンロードした `.tar` を `data/bluearchive_jpn-ground-truth-from-tar/` に展開する。

```bash
cd $HOME/project/arena_logger

rm -rf data/bluearchive_jpn-ground-truth-from-tar
mkdir -p data/bluearchive_jpn-ground-truth-from-tar

for archive in data/bluearchive_jpn-ground-truth/*.tar; do
  tar -xf "$archive" -C data/bluearchive_jpn-ground-truth-from-tar
done
```

## データ検証

ファイル数とサブディレクトリ混入を確認する。

```bash
find data/bluearchive_jpn-ground-truth-from-tar -maxdepth 1 -type f -name '*.png' | wc -l
find data/bluearchive_jpn-ground-truth-from-tar -maxdepth 1 -type f -name '*.gt.txt' | wc -l
find data/bluearchive_jpn-ground-truth-from-tar -mindepth 1 -type d
find data/bluearchive_jpn-ground-truth-from-tar -maxdepth 1 -type f ! -name '*.png' ! -name '*.gt.txt'
```

basename のペア欠けを確認する。

```bash
comm -23 \
  <(find data/bluearchive_jpn-ground-truth-from-tar -maxdepth 1 -type f -name '*.png' -printf '%f\n' | sed 's/\.png$//' | sort) \
  <(find data/bluearchive_jpn-ground-truth-from-tar -maxdepth 1 -type f -name '*.gt.txt' -printf '%f\n' | sed 's/\.gt\.txt$//' | sort)

comm -13 \
  <(find data/bluearchive_jpn-ground-truth-from-tar -maxdepth 1 -type f -name '*.png' -printf '%f\n' | sed 's/\.png$//' | sort) \
  <(find data/bluearchive_jpn-ground-truth-from-tar -maxdepth 1 -type f -name '*.gt.txt' -printf '%f\n' | sed 's/\.gt\.txt$//' | sort)
```

空ラベルと辞書外ラベルを確認する。

```bash
find data/bluearchive_jpn-ground-truth-from-tar -maxdepth 1 -type f -name '*.gt.txt' -empty -print

node --input-type=module -e "import { readdirSync, readFileSync } from 'node:fs'; import { join } from 'node:path'; import { characterNames } from './src/constants/characterNames.ts'; const dir='data/bluearchive_jpn-ground-truth-from-tar'; const labels=[]; for (const file of readdirSync(dir).filter((f)=>f.endsWith('.gt.txt')).sort()) labels.push([file, readFileSync(join(dir,file),'utf8').trim()]); const unknown=labels.filter(([,label])=>!characterNames.includes(label)); const empty=labels.filter(([,label])=>!label); console.log('labels', labels.length); console.log('unique labels', new Set(labels.map(([,label])=>label)).size); console.log('empty labels', empty.length); console.log('unknown labels', unknown.length); for (const [file,label] of unknown) console.log(`${file}: ${label}`);"
```

ポジション分布を確認する。

```bash
find data/bluearchive_jpn-ground-truth-from-tar -maxdepth 1 -type f -name '*.png' -printf '%f\n' \
  | sed -E 's/^.*-[0-9]{2}-//; s/\.png$//' \
  | sort \
  | uniq -c
```

今回の学習時は以下の状態で実行した。

```text
png: 276
gt.txt: 276
basename ペア欠け: 0
空ラベル: 0
辞書外ラベル: 0
12 ポジションすべて 23 件ずつ
```

## tesstrain へコピー

```bash
cd $HOME/project/tesstrain

rm -rf data/bluearchive_jpn-ground-truth
mkdir -p data/bluearchive_jpn-ground-truth

cp $HOME/project/arena_logger/data/bluearchive_jpn-ground-truth-from-tar/* \
  data/bluearchive_jpn-ground-truth/
```

確認する。

```bash
find data/bluearchive_jpn-ground-truth -maxdepth 1 -type f -name '*.png' | wc -l
find data/bluearchive_jpn-ground-truth -maxdepth 1 -type f -name '*.gt.txt' | wc -l
find data/bluearchive_jpn-ground-truth -mindepth 1 -type d
```

## 新規学習

古い生成物を削除する。

```bash
cd $HOME/project/tesstrain

rm -rf data/bluearchive_jpn data/jpn data/bluearchive_jpn.traineddata
```

`START_MODEL` を指定せずに新規学習する。

```bash
make data/bluearchive_jpn.traineddata \
  MODEL_NAME=bluearchive_jpn \
  MAX_ITERATIONS=10000 \
  TARGET_ERROR_RATE=0.01
```

今回の結果:

```text
Finished! Error rate = 12.227
```

通常の出力は float 版になるため、ブラウザ版 `tesseract.js` では以下のエラーで落ちることがある。

```text
Aborted(missing function: _ZN9tesseract13DotProductSSEEPKfS1_i)
```

そのため、checkpoint から integer 版を作る。

```bash
lstmtraining \
  --stop_training \
  --convert_to_int \
  --continue_from data/bluearchive_jpn/checkpoints/bluearchive_jpn_checkpoint \
  --traineddata data/bluearchive_jpn/bluearchive_jpn.traineddata \
  --model_output data/bluearchive_jpn_int.traineddata
```

確認する。

```bash
ls -lh data/bluearchive_jpn_int.traineddata
combine_tessdata -d data/bluearchive_jpn_int.traineddata
```

今回の integer 版は約 697KB。

## アプリへ配置

```bash
cp $HOME/project/tesstrain/data/bluearchive_jpn_int.traineddata \
  $HOME/project/arena_logger/public/tessdata/bluearchive_jpn.traineddata
```

アプリ側では `src/lib/ocr.ts` のキャラ名 OCR 言語を `bluearchive_jpn` にする。

```ts
const characterNameWorkerLanguage = "bluearchive_jpn";
```

確認する。

```bash
cd $HOME/project/arena_logger
npm test
npm run build
npm run dev
```

ブラウザで古い `.traineddata` がキャッシュされている場合があるため、モデル差し替え後はハードリロードする。

## fine-tuning の失敗メモ

`tessdata_fast/jpn.traineddata` を使った fine-tuning は以下のように実行した。

```bash
make training \
  MODEL_NAME=bluearchive_jpn \
  START_MODEL=jpn \
  TESSDATA=$HOME/project/tesstrain/tessdata_fast \
  MAX_ITERATIONS=10000
```

この環境では `lstmtraining` が checkpoint を作る前に segfault した。

```text
libtesseract.so.4.0.1
fatal signal 11
```

`dmesg` で確認できたため、データ不備ではなく Tesseract 4.1.1 側の問題として扱った。

## 評価

学習前後で同じスクリーンショットを使い、以下を見る。

- OCR 生テキスト
- 辞書補正後のキャラ名
- unknown 率
- 誤補正率

改善が見えない場合は、モデル学習よりも ground truth の切り出し品質、正解ラベル、2 行連結処理の一致を先に疑う。

## 参照

- https://github.com/tesseract-ocr/tesstrain
- https://tesseract-ocr.github.io/tessdoc/tess4/TrainingTesseract-4.00.html
