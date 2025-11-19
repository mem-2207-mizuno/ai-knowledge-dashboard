# AI Knowledge Dashboard

Google Apps Script (GAS) と clasp を使用して、スプレッドシートをデータベースとしたナレッジ管理ダッシュボードを構築するプロジェクトです。

## 概要

スプレッドシートに保存されたナレッジ情報を、Webページで見やすく表示・管理できるシステムです。検索、フィルタリング、コメント機能、いいね機能などを備えています。

## 技術スタック

- **Google Apps Script (GAS)**: バックエンドAPIとWebアプリケーション
- **clasp**: GASプロジェクトのローカル開発ツール
- **TypeScript**: 型安全な開発環境
- **Bun**: 高速なJavaScriptランタイム・パッケージマネージャー
- **Google Spreadsheet**: データベースとして使用

## 機能要件

### データ構造（スプレッドシート）

以下のカラムでナレッジ情報を管理します：

| カラム名 | 説明 | データ型 |
|---------|------|---------|
| タイトル | ナレッジのタイトル | 文字列 |
| URL | 記事のURL | 文字列 |
| コメント | 投稿者による説明・コメント（Markdown形式対応） | 文字列 |
| タグ | カテゴリやタグ（カンマ区切りで複数指定可能、例: `TypeScript,GAS,開発`） | 文字列 |
| 投稿日時 | 投稿された日時 | 日時 |
| 投稿者 | 投稿者の名前 | 文字列 |
| コメント履歴 | 追加されたコメントの記録 | 文字列（JSON形式など） |
| サムネイルURL | サムネイル画像のURL | 文字列 |
| いいね数 | いいねの数 | 数値 |

### Webページ機能

1. **ナレッジ一覧表示**
   - カード形式など、見やすいUIで一覧表示
   - サムネイル画像の表示
   - タイトル、投稿者、投稿日時、いいね数などの表示

2. **検索・フィルタ機能**
   - フリーワード検索（タイトル、コメント、URLなど）
   - タグによるフィルタリング
   - 複数条件の組み合わせ検索

3. **詳細表示**
   - ナレッジの詳細情報を表示
   - 記事URLへのリンク
   - コメント履歴の表示

4. **コメント機能**
   - ナレッジに対してコメントを追加
   - コメント履歴の表示・管理

5. **いいね機能**
   - ナレッジにいいねを付ける
   - いいね数の更新

## セットアップ

### 前提条件

- **Bun** がインストールされていること（[Bun公式サイト](https://bun.sh)からインストール）
- Googleアカウントがあること

### インストール手順

1. **Bun のインストール（未インストールの場合）**
```bash
curl -fsSL https://bun.sh/install | bash
```
または
```bash
npm install -g bun
```

2. **プロジェクトの依存関係をインストール**
```bash
bun install
```
これで `@google/clasp` もローカルにインストールされます。

3. **clasp のログイン**
```bash
bunx clasp login
```
または、グローバルにインストールする場合：
```bash
bun install -g @google/clasp
clasp login
```
ブラウザが開き、Googleアカウントでログインして認証を行います。

4. **GASプロジェクトの作成とリンク**
```bash
bunx clasp create --type webapp --title "AI Knowledge Dashboard"
```
または、グローバルにインストールした場合：
```bash
clasp create --type webapp --title "AI Knowledge Dashboard"
```
このコマンドで `.clasp.json` に `scriptId` が自動的に設定されます。

**注意**: このリポジトリはpublicのため、`.clasp.json` は `.gitignore` に含まれています。各開発者は自分でGASプロジェクトを作成するか、既存のプロジェクトにリンクしてください。

5. **スプレッドシートの準備**
   - Googleスプレッドシートを新規作成
   - スプレッドシートのURLからIDを取得（例: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`）
   - 以下のカラムを1行目に設定：
     ```
     A1: タイトル
     B1: URL
     C1: コメント
     D1: タグ
     E1: 投稿日時
     F1: 投稿者
     G1: コメント履歴
     H1: サムネイルURL
     I1: いいね数
     ```
   - スプレッドシートの共有設定で、GASスクリプトがアクセスできるようにする

6. **Script PropertiesにスプレッドシートIDを設定**
   - GASエディタを開く（`bunx clasp open`）
   - 左側のメニューから「プロジェクトの設定」（⚙️アイコン）をクリック
   - 「スクリプト プロパティ」タブを選択
   - 「スクリプト プロパティを追加」をクリック
   - **プロパティ**: `SPREADSHEET_ID`
   - **値**: スプレッドシートのID（URLから取得したID）
   - 「保存」をクリック

7. **コードをGASにプッシュ**
```bash
bun run push
```
または
```bash
bunx clasp push
```

8. **GASエディタで確認**
```bash
bun run open
```
または
```bash
bunx clasp open
```

9. **Webアプリとしてデプロイ**
   - GASエディタで「デプロイ」→「新しいデプロイ」を選択
   - 種類で「ウェブアプリ」を選択
   - 説明を入力し、「実行ユーザー」と「アクセスできるユーザー」を設定
   - 「デプロイ」をクリック
   - 表示されたURLがWebアプリのURLです

## プロジェクト構造

```
.
├── src/
│   ├── Code.ts          # メインのGASコード（TypeScript）
│   ├── index.html       # WebアプリのHTML
│   └── appsscript.json  # GASの設定ファイル
├── .clasp.json          # clasp設定ファイル（.gitignore対象、各開発者が個別に作成）
├── .clasp.json.example  # clasp設定ファイルのテンプレート
├── .claspignore        # claspで無視するファイル
├── tsconfig.json        # TypeScript設定
├── package.json         # Node.js依存関係
├── .gitignore          # Git除外ファイル
└── README.md           # このファイル
```

## 開発フロー

1. **ローカルでTypeScriptファイルを編集**
   - `src/Code.ts` でバックエンドロジックを編集
   - `src/index.html` でフロントエンドUIを編集

2. **GASにプッシュ**
```bash
bun run push
```
または
```bash
bunx clasp push
```

3. **GASエディタで確認（オプション）**
```bash
bun run open
```
または
```bash
bunx clasp open
```

4. **Webアプリをテスト**
   - デプロイしたWebアプリのURLにアクセス
   - 動作を確認

5. **変更を反映**
   - コードを修正したら `bun run push` または `bunx clasp push` で再プッシュ
   - Webアプリは自動的に最新版が反映されます（再デプロイ不要）

## 注意事項

- **Script Propertiesに`SPREADSHEET_ID`を設定してください**（コードには含まれていません）
- スプレッドシートの1行目はヘッダー行として使用されます
- コメント履歴はJSON形式で保存されます（空の場合は空文字列）
- **タグはカンマ区切りで複数指定できます**（例: `TypeScript,GAS,開発`）
- **コメント（説明）はMarkdown形式で記述できます**（見出し、リスト、コードブロック、リンクなどに対応）

### セキュリティについて

- **このリポジトリはpublicです**。`.clasp.json` には `scriptId` が含まれるため、`.gitignore` に含まれています

#### 開発パターン

**パターン1: 各開発者が個別のGASプロジェクトを使用する場合**
- 各開発者が自分でGASプロジェクトを作成し、`.clasp.json` をローカルで設定してください
- `.clasp.json.example` を参考に、自分の `scriptId` を設定してください

**パターン2: チームで同じGASプロジェクトを共有する場合**
- プロジェクト管理者から `scriptId` を非公開の方法で共有してもらいます
  - 例: Slack、メール、プライベートなドキュメント、1Passwordなどのパスワード管理ツール
- 共有された `scriptId` を使って `.clasp.json` を作成します：
  ```bash
  # .clasp.json.example をコピー
  cp .clasp.json.example .clasp.json
  
  # scriptId を編集（共有されたIDに置き換え）
  # または、直接作成：
  echo '{"scriptId":"共有されたSCRIPT_ID","rootDir":"src"}' > .clasp.json
  ```
- **重要**: `scriptId` は編集権限がない限り、公開されてもコードが見られるだけですが、publicリポジトリには含めないでください

### Bunとclaspについて

- BunはNode.js互換性が高いため、claspは通常問題なく動作します
- `bunx` コマンドを使用することで、ローカルにインストールされたclaspを実行できます
- もしclaspで問題が発生した場合は、`bun install -g @google/clasp` でグローバルにインストールして使用することもできます
- TypeScriptの型チェックはBunのネイティブサポートにより高速に動作します

## 今後の拡張予定

- 認証機能の追加
- 投稿者のプロフィール機能
- タグの自動補完
- ソート機能（日時、いいね数など）
- ページネーション
- レスポンシブデザインの最適化

## ライセンス

MIT

