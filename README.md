# Arena Logger

Blue Archive の PC 版スクリーンショットから、戦術対抗戦の記録用 TSV をブラウザ内で生成する静的 Web アプリです。

このプロジェクトは非公式ツールです。Blue Archive、NEXON Games、Yostar とは関係ありません。

## 機能

- 複数のスクリーンショットをまとめてキューに追加
- 各画像から戦闘日時、勝敗、ユーザー名、キャラ名、ダメージを抽出
- ユーザー名とキャラ名を確認・補正してから TSV に追加
- TSV のヘッダー有無を切り替え可能
- デバッグ用に OCR 領域や抽出結果を確認できる画面を提供
- 画像処理と OCR はブラウザ内で実行

## 使い方

1. アプリを開く
2. スクリーンショット画像を選択する
3. 画像ごとに OCR 結果を確認する
4. 必要に応じてユーザー名とキャラ名を修正する
5. `TSVに追加` を押す
6. TSV 欄の内容をコピーする

PC版の画面比率4:3のスクリーンショットにのみ対応しています。
スクリーンショットのファイル名は、日時抽出のために以下の形式を想定しています。

```text
BlueArchive YYYY-MM-DD HHMMSS.png
```

例:

```text
BlueArchive 2026-03-18 192912.png
```

## 出力データ

1 戦闘を 1 行で出力します。攻撃側と防衛側は、画像上の左右位置ではなく役割ベースで並び替えます。
Spreadsheetでの使用を想定しており、そのままコピー&ペースト可能なTSVで出力されます。

主な列:

- `created_at`
- `attacker_win`
- `attacker_user_name`
- `defender_user_name`
- `attacker_char_1` ... `attacker_char_6`
- `defender_char_1` ... `defender_char_6`
- `attacker_char_1_damage` ... `attacker_char_6_damage`
- `defender_char_1_damage` ... `defender_char_6_damage`

`created_at` は `YYYY-MM-DD HH-mm-SS` 形式です。ヘッダー行は画面上の `ヘッダーを付与` で切り替えます。

## Requirements

- Node.js 24

## Setup

```sh
npm install
```

## Development

```sh
npm run dev
```

## Test

```sh
npm test
```

## Build

```sh
npm run build
```

Vite の `base` は `/arena_logger/` に設定しています。GitHub Pages で `https://<user>.github.io/arena_logger/` 配下に公開する前提です。

## OCR Data

キャラ名 OCR には `public/tessdata/bluearchive_jpn.traineddata` を使います。

このモデルは `docs/tesseract-training.md` の手順で作成したものです。現行手順では `START_MODEL` を指定せず、新規学習したモデルを配置しています。

## License

このリポジトリのソースコードとドキュメントは MIT License です。

ただし、`public/tessdata/bluearchive_jpn.traineddata` はキャラ名 OCR 用の学習済みデータとして MIT License は適用されません。

Blue Archive に関する名称、画像、ゲーム内素材などの権利は各権利者に帰属します。このアプリは非公式の補助ツールです。

## Q&A

Q. キャラ名の認識精度が低くないですか？
A. 直近のシーズン変更に伴いデータが足りておらず現状精度が低いです。そのうち改善するかもしれません。しないかもしれません。

Q. このアプリに渡した情報はどこかに送信されますか？
A. 画像解析はブラウザ上で実行され、画像や抽出結果はあなた以外に送信されることはありません。

Q. PC版以外のスクリーンショットへ対応する予定はありますか？
A. 今のところ予定していません。(多分大変なので)
