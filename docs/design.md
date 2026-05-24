# Arena Logger 設計メモ

## 概要

このアプリケーションは、ブラウザ上で動作する静的な Web アプリとして構築する。
ユーザーはゲームの固定スクリーンショットを複数枚まとめて入力し、ブラウザ内で OCR とアイコン判定を実行して必要なデータを抽出する。
最終的な出力は固定フォーマットの TSV 文字列とし、ファイル保存ではなく画面上に表示してコピーできるようにする。

実装には React と TypeScript を使用する。
必要に応じて Next.js や追加ライブラリを採用してよいが、アプリケーションサーバーを必要としない構成を前提とする。

## 要件

### 機能要件

- ブラウザ上で利用できること
- アプリケーションサーバーを必要とせず、静的 Web ページとして動作すること
- ユーザーがスクリーンショット画像をアップロードできること
- 複数のスクリーンショットを一括で処理できること
- 各画像に対して OCR を実行できること
- OCR 結果から必要な項目を抽出できること
- 抽出結果を固定の TSV フォーマットで生成できること
- TSV はファイルではなく画面上のテキストボックスに表示すること

### 技術要件

- フロントエンドは React を使用する
- 言語は TypeScript を使用する
- 必要に応じて Next.js を利用できる
- 追加ライブラリは要件に応じて採用できる

## 設計方針

- すべての処理をクライアントサイドで完結させる
- 画像アップロード、OCR、アイコン判定、TSV 生成までをブラウザ内で処理する
- 対象が固定のスクリーンショットである前提を活かし、必要箇所を座標ベースで切り出して処理する
- 複数画像の処理時はブラウザ負荷を考慮し、並列数を制御する
- 抽出失敗時は通知して処理を中断する

## 想定アーキテクチャ

- UI: React
- 言語: TypeScript
- ビルド基盤: Vite を第一候補とする
- OCR: tesseract.js を第一候補とする
- 画像前処理: Canvas API を基本とし、必要に応じて OpenCV.js を検討する

Next.js は必須ではない。
SSR や API ルートが不要なため、現時点では Vite の方が構成が軽く、要件にも合いやすい。

## 想定処理フロー

1. ユーザーがスクリーンショットを複数選択する
2. 各画像から `battle_time` をファイル名ベースで抽出する
3. 各画像の必要領域を切り出す
4. 攻撃/防衛アイコンを判定する
5. `Win/Lose`、ユーザー名、キャラ名、ダメージ量を OCR で読み取る
6. 抽出結果を整形して 1 戦闘 1 行のデータへ変換する
7. TSV 文字列を生成する
8. 画面上のテキストボックスに表示する

## 抽出対象データ

このアプリケーションが扱う 1 件のデータは、ある 2 人の戦闘結果を表す。

### 識別子

- 画像ファイル名に含まれる時刻を `battle_time` として扱う

### 戦闘データの基本構造

- 画像内には左右 2 人分のユーザー情報が表示される
- 左右それぞれについて、同じ構造のデータを抽出する

### ユーザーごとの抽出項目

- 攻撃または防衛
- Win または Lose
- ユーザー名
- 戦闘キャラ 1 名目から 6 名目までの情報

### 各キャラごとの抽出項目

- ダメージ量
- キャラ名

### 備考

- 攻撃または防衛はアイコンで判定する
- Win または Lose は一旦 OCR で扱う

## データ構造のたたき台

```ts
type BattleSide = {
  role: "attack" | "defense" | null;
  result: "win" | "lose" | null;
  userName: string;
  characters: BattleCharacter[];
};

type BattleCharacter = {
  characterName: string;
  damage: number | null;
};

type BattleRecord = {
  battleTime: string;
  left: BattleSide;
  right: BattleSide;
};
```

## battle_time の抽出ルール

`samples` 配下の画像名は、現時点では次の固定形式である。

```text
BlueArchive YYYY-MM-DD HHMMSS.png
```

例:

```text
BlueArchive 2026-03-18 192912.png
```

このため、`battle_time` はファイル名から日付部分と時刻部分を抜き出して生成する。

- 日付部分: `YYYY-MM-DD`
- 時刻部分: `HHMMSS`

内部処理と TSV 出力では、ソートや比較がしやすい `YYYYMMDDHHMMSS` 形式を採用する。

例:

- `20260318192912`

抽出には次の正規表現を利用する。

```ts
/^BlueArchive (\d{4}-\d{2}-\d{2}) (\d{6})\.png$/
```

実装方針は次の通りとする。

- まず正規表現で日付と時刻を抽出する
- 抽出後に `YYYYMMDDHHMMSS` へ正規化する
- パターンに一致しないファイルはエラー扱いにして中断する

## 攻撃/防衛の判定仕様

### 判定対象

各ユーザー領域には、Win または Lose の近くに役割を表すアイコンが表示される。

現在のサンプル画像では、次の対応になっている。

- 剣アイコン: 攻撃
- 盾アイコン: 防衛

### 判定方針

攻撃と防衛は文字ではなくアイコンで表現されているため、OCR は使わない。
対象領域を固定座標で切り出し、テンプレート比較によって判定する。

### 推奨する実装方式

1. 左右それぞれのユーザー領域から、役割アイコンの表示位置を固定座標で切り出す
2. 切り出した画像を必要に応じて前処理する
3. 攻撃用テンプレートと防衛用テンプレートの両方と比較する
4. 類似度が高い方を判定結果として採用する

### 判定結果の扱い

- 剣アイコンなら `attack`
- 盾アイコンなら `defense`
- 類似度が閾値未満の場合はエラー扱いにする

## 各項目の抽出方針

### Win/Lose

- 一旦 OCR で読み取る
- 詳細な前処理や補正ルールは実装を見ながら後で調整する

### ユーザー名

- OCR で読み取る
- 対応対象はアルファベット、数字、日本語とする
- 前後の空白は `trim` で除去する
- 記号は無視する
- 表記ゆれは考慮しない

### キャラ名

- OCR で読み取る
- 改行を含む名前を許容する
- 表記ゆれ補正辞書は初期段階では導入しない

### ダメージ量

- OCR で読み取る
- 数値のみが存在する前提で扱う
- カンマは存在しない前提とする
- 値域は 0 以上とする
- OCR 後は数値として解釈できる形へ整形する

## 抽出領域定義の方針

各項目は画像全体に対する相対座標で定義する。

### 理由

- 解像度差があっても比率ベースで吸収しやすい
- レイアウトが固定であれば、座標設定の再利用がしやすい
- OCR 領域とアイコン判定領域を同じ方法で管理できる

### 座標定義の考え方

```ts
type RelativeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
```

値は 0 から 1 の範囲で定義し、実際のピクセル値は読み込み画像サイズから算出する。

### 現時点の座標定義

左右ユーザー、Win/Lose、ユーザー名、各キャラ名、各ダメージ量の座標は、代表画像を基準に `docs/coordinate-spec.md` へ整理済み。

実装では `docs/coordinate-spec.md` の `relative` 値を定数化し、読み込んだ画像サイズから実ピクセル座標を算出する。

### 座標定義の注意点

- 現在の座標は `samples/BlueArchive 2026-03-18 192912.png` を基準にしたもの
- ダメージ領域は広めに取っているため、OCR ノイズが出る場合は数値付近へ狭める
- レイアウト差分が見つかった場合は、座標セットをバージョン管理できる形にする

## TSV 出力方針

TSV は、後続の絞り込み、集計、比較をしやすくするため、1 戦闘を 1 行で表現する。

また、画像上の左右位置をそのまま出力するのではなく、意味上の役割で列を正規化する。

- 左側の列群には常に攻撃側の情報を出力する
- 右側の列群には常に防衛側の情報を出力する
- 画像上で攻撃側と防衛側の表示位置が入れ替わっていても、TSV 出力時に並び替える

## TSV 列構成案

### 先頭の共通列

- `battle_time`

### 攻撃側の列

- `attacker_result`
- `attacker_user_name`
- `attacker_char_1_name`
- `attacker_char_1_damage`
- `attacker_char_2_name`
- `attacker_char_2_damage`
- `attacker_char_3_name`
- `attacker_char_3_damage`
- `attacker_char_4_name`
- `attacker_char_4_damage`
- `attacker_char_5_name`
- `attacker_char_5_damage`
- `attacker_char_6_name`
- `attacker_char_6_damage`

### 防衛側の列

- `defender_result`
- `defender_user_name`
- `defender_char_1_name`
- `defender_char_1_damage`
- `defender_char_2_name`
- `defender_char_2_damage`
- `defender_char_3_name`
- `defender_char_3_damage`
- `defender_char_4_name`
- `defender_char_4_damage`
- `defender_char_5_name`
- `defender_char_5_damage`
- `defender_char_6_name`
- `defender_char_6_damage`

### TSV 出力形式の補足

- 画面上のテキストボックスに TSV 文字列を表示する
- ダウンロード機能は MVP では不要とする
- 文字コードの BOM は付与しない
- 空欄は空文字として出力する

## TSV サンプルイメージ

```tsv
battle_time	attacker_result	attacker_user_name	attacker_char_1_name	attacker_char_1_damage	attacker_char_2_name	attacker_char_2_damage	attacker_char_3_name	attacker_char_3_damage	attacker_char_4_name	attacker_char_4_damage	attacker_char_5_name	attacker_char_5_damage	attacker_char_6_name	attacker_char_6_damage	defender_result	defender_user_name	defender_char_1_name	defender_char_1_damage	defender_char_2_name	defender_char_2_damage	defender_char_3_name	defender_char_3_damage	defender_char_4_name	defender_char_4_damage	defender_char_5_name	defender_char_5_damage	defender_char_6_name	defender_char_6_damage
20260318192912	win	player_a	char_a	12345	char_b	23456	char_c	34567	char_d	45678	char_e	56789	char_f	67890	lose	player_b	char_g	11111	char_h	22222	char_i	33333	char_j	44444	char_k	55555	char_l	66666
```

## エラー時の扱い

処理に必要な項目の抽出に失敗した場合は、ユーザーへ通知し、その時点で処理を中断する。

現時点では次の方針とする。

- 画像名から `battle_time` を抽出できない場合は中断する
- 攻撃/防衛の判定に失敗した場合は中断する
- OCR 結果の整形に失敗した場合は中断する
- 中断時は、どの画像のどの項目で失敗したかを通知する

部分的に空欄のまま続行する挙動は、初期実装では採用しない。

## UI 方針

- 抽出した TSV はテキストボックスに表示する
- ユーザーはその内容をコピーして利用する
- 手修正 UI は不要とする
- エラーは画面上に通知する

## MVP の範囲

- 1種類の固定レイアウトのスクリーンショットに対応する
- 複数画像のアップロードと一括処理に対応する
- 必要項目の OCR 抽出を行う
- 攻撃/防衛アイコン判定を行う
- 抽出結果から TSV 文字列を生成する
- TSV を画面上のテキストボックスに表示する

## 今後の拡張候補

- 複数の画面レイアウトへの対応
- OCR 前処理の高度化
- キャラ名の補正辞書追加
- 処理失敗画像の再実行
- 設定の保存

## 未確定事項

- 対応するスクリーンショットの解像度や比率
- 同一ゲーム内での画面レイアウト差分の有無
- OCR 実行時の対応言語
- 攻撃と防衛のアイコン判定ルールの詳細
- Win/Lose の OCR 前処理や補正ルール
- キャラ名の表記ゆれ補正辞書を導入するか

## 推奨する次の整理

次の段階では、以下を具体化すると実装に入りやすい。

- 画面構成
- 画像ごとの処理状態管理
- OCR 対象領域の座標定義方法
- `samples` ベースの各領域の具体座標
