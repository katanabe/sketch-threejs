# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Three.js インタラクティブスケッチのポートフォリオサイト。Next.js (App Router) + TypeScript + Three.js で構成。静的サイトとしてエクスポートされる。

## Commands

```bash
npm run dev    # 開発サーバー起動 (Turbopack)
npm run build  # 本番ビルド (静的エクスポート)
npm run start  # 本番サーバー起動
```

テスト・リンターは未導入。

## Architecture

### Sketch Module パターン

各スケッチは `src/sketches/{slug}/index.ts` にファクトリ関数として実装し、`SketchModule` を返す:

```typescript
type SketchModule = {
  init: (canvas: HTMLCanvasElement) => void
  dispose: () => void
}
```

- クロージャで Three.js の状態（scene, camera, renderer 等）を管理
- `init`: レンダラー生成 → シーン構築 → リサイズハンドラ設定 → アニメーションループ開始
- `dispose`: animationFrame キャンセル → イベントリスナー除去 → geometry/material/renderer の dispose
- デフォルトエクスポートは `sketch()` の呼び出し結果（インスタンス）

### ページルーティング

- `src/app/sketch/[slug]/page.tsx` — SSG で `generateStaticParams` により全スケッチのページを生成
- `SketchPage.tsx` (client component) — マウント時に `src/sketches/{slug}` を動的インポートし、canvas に init → アンマウント時に dispose

### スケッチの追加手順

1. `src/sketches/{slug}/index.ts` を作成（上記パターンに従う）
2. `src/sketches/index.ts` の `sketches` 配列にエントリを追加

### 共有ユーティリティ (`src/lib/three/`)

- `createRenderer.ts` — WebGL レンダラー生成（アンチエイリアス有効、devicePixelRatio は最大2）
- `resize.ts` — ウィンドウリサイズ時のカメラ・レンダラー更新、クリーンアップ関数を返す
- `stats.ts` — パフォーマンス統計 UI

### シェーダー

GLSL ファイル (`.glsl`, `.vert`, `.frag`) は raw-loader で文字列としてインポート。Turbopack / Webpack 両方に設定済み。型定義は `src/types/glsl.d.ts`。

## Conventions

- CSS Modules (`.module.css`) でスタイルをスコープ化
- ダークモードのみ（`color-scheme: dark`）
- コミットメッセージ: 命令形動詞で始める（例: "Add unit-circle sketch for sin/cos/tan visualization"）
- パス解決: `@/*` → `./src/*`
