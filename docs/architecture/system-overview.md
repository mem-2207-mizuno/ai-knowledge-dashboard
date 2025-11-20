# System Overview

AI Knowledge Dashboard の全体構成を俯瞰する。詳細なシート仕様は [Spreadsheet Schema](../specs/spreadsheet-schema.md)、機能計画は [Dashboard Plan](../design/dashboard-plan.md) を参照。

## 1. Runtime Flow

````mermaid
sequenceDiagram
    participant User
    participant Browser as Browser (SPA)
    participant GAS as GAS (Code.ts)
    participant Sheets as Spreadsheet

    User->>Browser: Access Web App / exec?id=123
    Browser->>GAS: google.script.run.getKnowledgeList()
    GAS->>Sheets: Read Posts/Tags/PostTags/Comments
    Sheets-->>GAS: Aggregated rows
    GAS-->>Browser: initialData + SERVER_DATA
    Browser->>Browser: Render cards + optional modal

    User->>Browser: Submit comment / like
    Browser->>Browser: Optimistic UI update
    Browser->>GAS: addComment / addLike (clientId含む)
    GAS->>Sheets: Append rows / update likesCount
    Sheets-->>GAS: Success
    GAS-->>Browser: Result (JSON)
    Browser->>Browser: Refresh local cache if needed
`````

## 2. Module Responsibilities

- **Browser SPA (`src/index.html`)**
  - SSR で埋め込まれた `SERVER_DATA` を初期データとして描画。
  - URL パラメータと `History API` でモーダル表示を制御。
  - コメント/いいねは楽観的に UI へ反映し、結果受信後に再同期。
  - LocalStorage に `clientId` や「いいね済み ID」を保持。

- **GAS (`src/Code.ts`, services)**
  - `doGet` で `initialData` と `initialId` をテンプレートへ注入。
  - `KnowledgeService` が Posts/Tags/PostTags/Comments/Likes を結合して API レスポンスを生成。
  - `MigrationService` が旧 `シート1` から新スキーマへの移行を一括で実行。

- **Spreadsheet**
  - `Posts` を中核に、`Tags`/`PostTags`/`Comments`/`Likes` を正規化して保持。
  - Apps Script のキャッシュを活用しつつ、書き込み時はキャッシュを無効化する。

## 3. Deployment / Tooling

- `bun run build` → esbuild が `dist/` を生成。
- `clasp push` → GAS プロジェクトに反映。
- `clasp run migrateLegacyData -p '{...}'` → 旧データ移行。

各工程の詳細手順は README の「Getting Started」「Deployment」節を参照。
