# Three.js Portfolio with Next.js - 実装計画

## Context

[ykob/sketch-threejs](https://ykob.github.io/sketch-threejs/) のような、
Three.js インタラクティブスケッチをポートフォリオとして展示するサイトを構築する。

技術スタック: **Next.js (App Router) + TypeScript + Three.js**

将来的に **React Three Fiber (R3F)** へ移行することを視野に入れた設計にする。

---

## 参考サイト

- サイト: https://ykob.github.io/sketch-threejs/
- リポジトリ: https://github.com/ykob/sketch-threejs

### 参考サイトの特徴
- ミニマリストなリスト形式トップページ（タイトル・日付・リンク）
- 各スケッチは全画面 canvas
- シンプルで作品そのものが主役のデザイン

---

## リポジトリ構成

```
sketch-threejs/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions デプロイ
├── public/
│   └── assets/
│       ├── textures/
│       ├── models/
│       └── hdri/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # ルートレイアウト（最小限）
│   │   ├── page.tsx                # トップページ（スケッチ一覧）
│   │   ├── globals.css
│   │   └── sketch/
│   │       └── [slug]/
│   │           └── page.tsx        # 各スケッチページ（動的ルート）
│   ├── components/
│   │   ├── SketchList.tsx          # スケッチ一覧コンポーネント
│   │   └── SketchCanvas.tsx        # Three.js キャンバス（'use client'）
│   ├── sketches/                   # 各スケッチの実装
│   │   ├── index.ts                # スケッチ一覧データ（メタ情報）
│   │   ├── basic-scene/
│   │   │   └── index.ts
│   │   ├── particles/
│   │   │   └── index.ts
│   │   └── shader-waves/
│   │       ├── index.ts
│   │       ├── vertex.glsl
│   │       └── fragment.glsl
│   ├── lib/
│   │   └── three/
│   │       ├── createRenderer.ts   # WebGLRenderer ヘルパー
│   │       ├── resize.ts           # リサイズハンドラ
│   │       └── stats.ts            # Stats.js ラッパー
│   └── types/
│       └── glsl.d.ts               # *.glsl モジュール型定義
├── next.config.ts
├── package.json
├── tsconfig.json
├── PLAN.md                         # このファイル
└── README.md
```

---

## 技術選定

### Next.js 構成
- **App Router** + `output: 'export'` で静的サイト生成（GitHub Pages 対応）
- Three.js コンポーネントは `'use client'` + `useEffect` で初期化
- GLSL は `raw-loader` で文字列 import

### パッケージ

```json
{
  "dependencies": {
    "next": "^15.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "three": "^0.173.0",
    "lil-gui": "^0.20.0"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^22.x",
    "@types/react": "^19.x",
    "@types/react-dom": "^19.x",
    "@types/three": "^0.173.0",
    "raw-loader": "^4.x"
  }
}
```

### next.config.ts

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.CI ? '/sketch-threejs' : '',
  trailingSlash: true,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vert|frag)$/,
      use: 'raw-loader',
    })
    return config
  },
}

export default nextConfig
```

---

## R3F 移行を見越した設計方針

- 各スケッチは `useEffect` + `useRef` パターンで実装（R3F の hooks と同じ考え方）
- Three.js シーン構築ロジックを `src/sketches/{slug}/index.ts` に分離し、React コンポーネントから切り離す
- `SketchCanvas.tsx` のインターフェースは将来 R3F の `<Canvas>` に差し替えられる形にする
- グローバル state 管理は使わず、各スケッチが自己完結する設計

### スケッチモジュールのインターフェース

```typescript
// src/sketches/{slug}/index.ts
export type SketchModule = {
  init: (canvas: HTMLCanvasElement) => void
  dispose: () => void
}
```

### スケッチ一覧データ

```typescript
// src/sketches/index.ts
export type Sketch = {
  slug: string
  title: string
  date: string  // YYYY-MM-DD
  description?: string
}

export const sketches: Sketch[] = [
  { slug: 'shader-waves', title: 'Shader Waves', date: '2026-03-05' },
  { slug: 'particles',    title: 'Particles',    date: '2026-03-01' },
  { slug: 'basic-scene',  title: 'Basic Scene',  date: '2026-02-20' },
]
```

---

## 初期スケッチセット（5個）

| slug | タイトル | 内容 | 難易度 |
|---|---|---|---|
| basic-scene | Basic Scene | 回転するオブジェクト + OrbitControls | 入門 |
| particles | Particles | 10万粒子 + マウスインタラクション | 中級 |
| shader-waves | Shader Waves | カスタム GLSL 波面シェーダー | 中級 |
| pbr-sphere | PBR Sphere | 物理ベースマテリアル + 環境マップ | 初中級 |
| instanced | Instanced Mesh | InstancedMesh による GPU パフォーマンスデモ | 上級 |

---

## トップページデザイン（ykob 参考）

- ミニマリストリスト形式
- 各行: 日付 + タイトル + リンク
- ヘッダーに名前と GitHub リンク
- ダークテーマ（黒背景）

---

## デプロイ（GitHub Actions → GitHub Pages）

```yaml
# .github/workflows/deploy.yml
# main push → npm run build → out/ を Pages にアップロード
```

- GitHub Settings → Pages → Source: **GitHub Actions** に変更
- `basePath: '/sketch-threejs'` で配信パスを設定（CI 環境変数で切り替え）
- デプロイ先: `https://katanabe.github.io/sketch-threejs/`

---

## セットアップ手順

```bash
# 1. create-next-app でプロジェクト作成
pnpm create next-app@latest . --typescript --app --no-tailwind --no-eslint --src-dir --import-alias "@/*"

# 2. 追加パッケージインストール
pnpm add three lil-gui
pnpm add -D @types/three raw-loader

# 3. 開発サーバー起動
pnpm dev

# 4. ビルド確認
pnpm build
```

---

## 実装ステップ

- [ ] `create-next-app` でプロジェクト初期化
- [ ] `next.config.ts` に `output: 'export'`、basePath、GLSL webpack 設定
- [ ] `src/sketches/index.ts` にスケッチメタデータ定義
- [ ] `src/app/page.tsx` トップページ（スケッチ一覧）
- [ ] `src/app/sketch/[slug]/page.tsx` + `SketchCanvas.tsx`
- [ ] `src/lib/three/` ヘルパー実装
- [ ] basic-scene スケッチ実装
- [ ] particles スケッチ実装
- [ ] shader-waves スケッチ実装
- [ ] GitHub Actions デプロイ設定
