# JSON 差分比較・結合ツール

2 つの JSON ファイルを読み込み、差分を色付きで比較し、選択した差分だけを取り込んだ結合結果を生成する Web アプリです。

---

## アプリの概要

**何ができるツールか**

| 機能 | 説明 |
|------|------|
| **差分表示** | ファイル A（ベース）とファイル B（比較）を左右に並べ、行単位で差分を表示。追加＝緑、削除＝赤、変更＝黄で色分け。 |
| **変更箇所のインラインハイライト** | 変更行では、行全体ではなく「どこが変わったか」だけを濃い黄色で強調（例: `"name":"田中**太郎**"` → `"name":"田中**一郎**"`）。 |
| **クリックで差分選択** | 色付きの行をクリックすると、その差分ブロックの「取り込み」をオン/オフ。選択したブロックだけが結合結果に反映される。 |
| **結合結果の常時表示** | ベースを土台に、選択した差分を反映した結果をリアルタイムで表示。結合ボタンは不要。 |
| **JSON 検証** | 結合結果が不正な JSON になる場合はエラーメッセージを表示し、「結合結果をダウンロード」を非活性化。 |
| **ダウンロード** | 結合結果を `merged.json` として保存可能（JSON が有効なときのみ）。 |

---

## 使用技術スタック

| カテゴリ | 技術 | 用途 |
|----------|------|------|
| フレームワーク | ![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?logo=vuedotjs) | UI とリアクティブな状態管理 |
| 言語 | ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript) | 型安全な実装 |
| ビルド | ![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite) | 開発サーバー・ビルド |
| テスト | ![Vitest](https://img.shields.io/badge/Vitest-4.x-FCC72B?logo=vitest) | 単体テスト・カバレッジ |
| テスト | ![Vue Test Utils](https://img.shields.io/badge/Vue%20Test%20Utils-2.x-4FC08D) | コンポーネントのマウント・操作 |
| 差分アルゴリズム | [diff](https://github.com/kpdecker/jsdiff) | 行差分（`diffLines`）・文字差分（`diffChars`） |
| 型チェック | vue-tsc | Vue + TS のビルド時型検査 |

※ スタイルは Tailwind CSS は使っておらず、Vite 付属の CSS（`base.css` / `main.css`）とコンポーネントの scoped CSS で実装しています。

---

## ディレクトリ構成図

```text
vue_ts/
├── index.html              # エントリー HTML
├── vite.config.ts           # Vite の設定
├── vitest.config.ts         # Vitest の設定（jsdom, @ エイリアス）
├── src/
│   ├── main.ts              # アプリのエントリー。createApp(App).mount('#app')
│   ├── App.vue               # ルートコンポーネント（ルーティング時はここで view を切り替え）
│   ├── assets/               # 静的アセット（base.css, main.css, logo.svg）
│   │
│   ├── views/
│   │   └── JsonDiffView.vue   # メイン画面: ファイル読み込み、左右パネル、結合結果、検証・ダウンロード
│   │
│   ├── components/
│   │   ├── DiffLineList.vue   # 差分行のリスト表示（行番号・色・クリック選択・インライン強調）
│   │   └── DiffLineList.spec.ts  # 上記コンポーネントのテスト
│   │
│   └── composables/          # 再利用可能なロジック（Vue の Composition API）
│       ├── useJsonDiff.ts     # 行単位の差分計算、ブロック ID 付与、変更行のインライン差分（diffChars）
│       ├── useJsonDiff.test.ts
│       ├── useJsonMerge.ts    # 選択ブロックに基づく結合テキスト生成（ベース＋選択差分）
│       └── useJsonMerge.test.ts
│
└── public/                   # そのまま配信される静的ファイル（favicon 等）
```

### 主要なファイルの役割

| ファイル | 役割 |
|----------|------|
| `JsonDiffView.vue` | ファイル A/B の入力（テキストエリア・ファイル選択）、`useJsonDiff` / `useJsonMerge` の利用、結合結果の表示、JSON 検証、ダウンロード処理。 |
| `DiffLineList.vue` | 差分行リストの描画。行タイプ（unchanged / added / removed / changed）に応じたクラスと、変更行の `inlineDiff` による部分ハイライト。クリックで `toggle(blockId)` を emit。 |
| `useJsonDiff.ts` | `diffLines` で行差分を取得。追加・削除・変更ブロックに `blockId` を付与。変更行同士は JSON キー（`"key":`）でペアリングし、`diffChars` でインラインセグメントを生成。 |
| `useJsonMerge.ts` | `diffLines` の結果を useJsonDiff と同じ順で走査し、`selectedBlockIds` に含まれるブロックだけを比較側の内容で採用。それ以外はベースの内容をそのまま使用。 |

---

## こだわったポイント

1. **二段階の差分ロジック**
   - **行単位**: `diffLines` で行の追加・削除・変更を検出。左右の行を 1:1 で揃え、片方にしかない行はもう一方を空行（パディング）で埋める。
   - **変更行の中身**: 変更と判定された行ペアには `diffChars` を適用し、「太郎」→「一郎」のように**変更があった部分だけ**を濃い黄色で表示。

2. **キーに基づく変更のペアリング**
   - 削除行と追加行の組み合わせで、`"key":` のような JSON キーが一致する行を「変更」としてペアリング。キーが一致しないものは「削除」「追加」として別ブロックにしている。

3. **結合は常にベース基準**
   - 結合結果は「ベースの内容を土台に、選択した差分ブロックだけ比較側で上書き」と一貫したルール。選択していない部分は必ずベースのまま。

4. **テスト自動化**
   - **Vitest** で composables（`useJsonDiff`, `useJsonMerge`）とコンポーネント（`DiffLineList`）をテスト。ブロック ID の一致や選択状態の反映、インラインディフの表示までカバー。
   - `npm run test:run` / `npm run test:coverage` で CI やマージ前の確認が可能。

5. **結合結果の JSON 検証**
   - 現在の選択で結合した文字列を `JSON.parse` で検証。不正な場合は画面にエラーを表示し、ダウンロードボタンを非活性にして、壊れた JSON を保存できないようにしている。

---

## セットアップ・開発・テスト

```sh
# 依存関係のインストール
npm install

# 開発サーバー（ホットリロード）
npm run dev

# 型チェック
npm run type-check

# 本番ビルド
npm run build

# テスト
npm run test          # ウォッチでテスト実行
npm run test:run      # 1 回だけ実行
npm run test:coverage # カバレッジ付きで実行
```

---

## 推奨 IDE・ブラウザ

- **IDE**: [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar)（Vetur は無効推奨）
- **ブラウザ**: [Vue.js devtools](https://devtools.vuejs.org/) を入れるとコンポーネント・状態の確認がしやすいです。

---

## 設定のカスタマイズ

- Vite: [Vite Configuration Reference](https://vite.dev/config/)
- Vitest: `vitest.config.ts` で `include` / `environment` / エイリアスを変更可能

---

## 処理フロー

本アプリでは、JSON をオブジェクトとしてパースして木構造で再帰比較するのではなく、**テキストのまま行単位で比較**し、変更行ペアだけ文字単位の差分を取ります。`JSON.parse` は**読み込み時と結合結果の検証時**のみ使用します。

```mermaid
flowchart TB
  subgraph INPUT["入力"]
    A[ファイルA / 貼り付け] --> A1[テキストとして取得]
    B[ファイルB / 貼り付け] --> B1[テキストとして取得]
    A1 --> VA[JSON.parse で検証]
    B1 --> VB[JSON.parse で検証]
    VA -->|不正| REJECT_A[アラート表示・読み込み中止]
    VB -->|不正| REJECT_B[アラート表示・読み込み中止]
    VA -->|OK| baseText[(baseText)]
    VB -->|OK| compareText[(compareText)]
  end

  subgraph DIFF["差分判定 (useJsonDiff)"]
    baseText --> diffLines[diffLines で行単位差分]
    compareText --> diffLines
    diffLines --> chunks[追加/削除/変更のチャンク列]
    chunks --> walk[チャンクを順に走査]
    walk --> type{チャンク種別}
    type -->|unchanged| out_unchanged[そのまま出力]
    type -->|added| out_added[追加ブロック・blockId 付与]
    type -->|removed| next{直後が added?}
    next -->|Yes| keyMatch['キー一致で行ペアリング<br/>key で変更と判定']
    next -->|No| out_removed[削除ブロック・blockId 付与]
    keyMatch --> diffChars[diffChars で文字単位差分]
    diffChars --> out_changed[変更ブロック・blockId + インラインセグメント]
    out_unchanged --> result
    out_added --> result[leftLines / rightLines / blocks]
    out_removed --> result
    out_changed --> result
  end

  subgraph UI["表示・選択"]
    result --> display[左右パネルに色付き表示]
    display --> click[ユーザーが行をクリック]
    click --> selectedBlockIds[(selectedBlockIds 更新)]
  end

  subgraph MERGE["結合 (useJsonMerge)"]
    baseText --> mergeWalk[同じ diffLines を同じ順で走査]
    compareText --> mergeWalk
    selectedBlockIds --> mergeWalk
    mergeWalk --> apply{ブロックが選択済み?}
    apply -->|Yes| useCompare[比較側の内容を採用]
    apply -->|No| useBase[ベース側の内容を採用]
    useCompare --> mergedLines[結果行リスト]
    useBase --> mergedLines
    mergedLines --> mergedText[(mergedText)]
  end

  subgraph OUT["出力・検証"]
    mergedText --> validate[JSON.parse で結合結果を検証]
    validate -->|不正| errMsg[エラー表示・ダウンロード非活性]
    validate -->|OK| download[結合結果をダウンロード可能]
  end

  INPUT --> DIFF
  DIFF --> UI
  UI --> MERGE
  MERGE --> OUT
```

- **差分判定**: `diffLines`（行単位）→ 削除+追加が連続する場合は `"key":` が一致する行を「変更」としてペアリング → 変更ペアにだけ `diffChars`（文字単位）でインライン差分を付与。
- **結合**: 上記と同じ順でブロック ID を振り、`selectedBlockIds` に含まれるブロックだけ比較側の内容で上書きし、それ以外はベースのまま並べて `mergedText` を生成。
