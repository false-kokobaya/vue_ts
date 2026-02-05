# vue_ts

Vue 3 + Vite + TypeScript のプロジェクトです。JSON ファイルの差分比較・結合を行う Web アプリを含みます。

- **JSON 差分比較**: 2 つの JSON を左右に並べて色付きで差分表示（追加・削除・変更のインラインハイライト）
- **差分選択と結合**: 色付きの行をクリックで取り込み選択し、ベースを基に結合結果を常時表示
- **結合結果のダウンロード**: JSON 構文が有効なときのみ「結合結果をダウンロード」で保存可能

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Tests

```sh
npm run test        # ウォッチでテスト実行
npm run test:run    # 1 回だけ実行
npm run test:coverage  # カバレッジ付きで実行
```
