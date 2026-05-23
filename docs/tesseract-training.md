# Tesseract 学習メモ

## 方針

キャラ名 OCR の精度改善は、Tesseract 5 の LSTM モデルを `jpn.traineddata` から fine-tuning して試す。

このアプリではブラウザ版 `tesseract.js` から `/tessdata/jpn.traineddata` を読んでいるため、学習後の成果物は最終的に `public/tessdata/jpn.traineddata` へ配置する。

## 使用ツール

- Tesseract 5.3 以上
- Tesseract training tools
- `tesstrain`
- `make`
- `bash`
- `wget`
- `unzip`

公式の `tesstrain` は、Tesseract 5 用の Makefile ベースの学習ワークフロー。

## 学習データ

`tesstrain` の ground truth は、画像と正解テキストを同じ basename で並べる。

```text
data/bluearchive_jpn-ground-truth/
  000001.png
  000001.gt.txt
  000002.png
  000002.gt.txt
```

画像は、キャラ名だけを切り出した PNG にする。テキストは 1 行の UTF-8 プレーンテキストにする。

```text
ホシノ（水着）
```

2 行表示のキャラ名は、アプリ側の OCR 前処理と同じように横 1 行へ連結した画像を使う。

## データ作成ルール

- 正解テキストは `src/constants/characterNames.ts` に含まれる表記と一致させる
- `（` `）` は全角を使う
- `*` ではなく、画面と辞書に合わせて `＊` を使う
- 空白は入れない
- OCRで失敗している名前を優先して集める
- 同じ名前でも、背景・左右位置・1行/2行・画質が違うサンプルを複数入れる

まずは 200 から 500 サンプル程度で fine-tuning を試す。効果が見えたら増やす。

## 学習コマンド例

`tesstrain` リポジトリを別ディレクトリに用意して実行する。

```bash
git clone https://github.com/tesseract-ocr/tesstrain.git
cd tesstrain
mkdir -p data/bluearchive_jpn-ground-truth
```

このプロジェクトで作った ground truth を `data/bluearchive_jpn-ground-truth` へコピーする。

```bash
make training \
  MODEL_NAME=bluearchive_jpn \
  START_MODEL=jpn \
  TESSDATA=/path/to/tessdata_best \
  MAX_ITERATIONS=10000
```

学習後、生成された `traineddata` をこのプロジェクトへ配置する。

```bash
cp data/bluearchive_jpn/tessdata_best/bluearchive_jpn.traineddata \
  /path/to/arena_logger/public/tessdata/jpn.traineddata
```

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
