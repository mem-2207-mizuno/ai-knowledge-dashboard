# AI Knowledge Dashboard

Google Apps Script (GAS) + TypeScript + Google Spreadsheet で構築するナレッジ共有ダッシュボード。URL ルーティング / コメント / いいね / タグ検索などを備えた軽量 SPA を目指している。

## Features

- SSR 初期データ + `History API` による Deep Linking（`?id=xxx` でモーダルを直接開く）
- Posts / Tags / PostTags / Comments / Likes シートへ正規化したデータモデル
- コメント & いいねの楽観的 UI、LocalStorage による clientId / いいね済み状態管理
- `MigrationService` による旧シートからの一括移行

## Tech Stack

- **Runtime**: Google Apps Script
- **Dev Tools**: TypeScript, Bun, esbuild, clasp
- **Data Store**: Google Spreadsheet (複数シート構成)

## Getting Started

1. **Install & link**
   ```bash
   bun install
   bunx clasp login
   ```
   `.clasp.json` で対象 GAS プロジェクトに紐付ける。

2. **Configure Spreadsheet**
   - 対象スプレッドシートを作成し、ID を取得。
   - GAS の「スクリプト プロパティ」に `SPREADSHEET_ID` を登録。
   - 既存データが旧 `シート1` 形式の場合は後述の `migrateLegacyData` を利用。

3. **Build & push**
   ```bash
   bun run build
   bun run push   # = bun run build && clasp push
   ```
   デプロイは GAS エディタの「デプロイ > 新しいデプロイ」で実施。

### Useful Scripts

| Command | Description |
| --- | --- |
| `bun run build` | esbuild で `dist/` を生成 |
| `bun run push` | ビルド + `clasp push` |
| `clasp run migrateLegacyData -p '{"sourceSheetName":"シート1","truncateTarget":true}'` | 旧シートから正規化シートに移行 |

## Documentation

- [Dashboard Plan](docs/design/dashboard-plan.md) – UI/UX 方針と優先順位
- [Spreadsheet Schema](docs/specs/spreadsheet-schema.md) – シート設計と移行手順
- [System Overview](docs/architecture/system-overview.md) – ランタイム構成とデータフロー
- [Documentation Guidelines](docs/guides/documentation-guidelines.md) – ドキュメント作成時のルール

各ドキュメントは README から辿れるようリンクを張り、詳細なコード記述は避ける（The truth is in the code）。
