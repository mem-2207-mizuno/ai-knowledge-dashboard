# UI Layout Overview

2カラム構成の Notion ライク UI について、主要コンポーネントと振る舞いをまとめる。実装詳細は `src/index.html` を参照。

## 1. Layout Structure

```mermaid
flowchart LR
    Sidebar["Sidebar<br/>- logo / CTA<br/>- search box<br/>- view switcher<br/>- category chips<br/>- tag chips"]
    Main["Main Content<br/>- header<br/>- insight cards<br/>- knowledge grid<br/>- modals"]
    Sidebar --> Main
```

- **Sidebar**: 固定 300px。検索、ビュー（ホーム/お気に入り）、カテゴリ、タグをまとめ、左カラムだけでフィルタが完結するようにした。
- **Main Content**: ヘッダー + インサイトカード + カードグリッドの順に並べ、視線を上→下に流しやすい構成。

## 2. Components

- **Search / Filters**:
  - キーワード検索は `searchKnowledge` で即時フィルタ。
  - ビュー切り替え（全件/お気に入り）・カテゴリ切り替えは state (`currentView`, `selectedCategory`) を更新し `filterKnowledge` へ集約。
  - タグチップはクリックで `selectedTags` をトグル。

- **Insight Cards** (`Total entries`, `Favorites`, `Comments`):
  - `updateInsights` で `allKnowledge` とローカル state をもとに再計算。

- **Knowledge Card**:
  - カバービジュアル（任意）、カテゴリバッジ、ステータス Pill、要約テキスト、タグ、いいねボタンを含む。
  - いいねは LocalStorage に保存した `clientId`/`likedIds` を用いた楽観更新。

- **Modals**:
  - 詳細モーダルではカテゴリ/ステータス/URL/Markdown 描画/コメント/いいね/共有/編集をまとめて表示。
  - 追加/編集モーダルは従来のフォームを流用しつつ、今後カテゴリ固有メタデータ拡張を予定。

## 3. Interactions

- `filterKnowledge()` が検索/カテゴリ/タグ/ビュー/お気に入りフィルタを一括で適用し、`renderKnowledgeGrid` に渡す。
- コメント・いいねは楽観的 UI → サーバー応答後に `loadKnowledge` or state 更新を行う。
- `updateCategoryUI` / `updateViewUI` でサイドバーのボタン状態を同期。

## 4. Feedback / Notifications

```mermaid
flowchart LR
    Event["User action<br/>保存/コピー/読み込み失敗"] --> show["showNotification(message, type)"]
    show --> Stack["Notification stack (top-right)"]
    Stack --> AutoClose["Auto close (duration)"]
    Stack --> ManualClose["Click / × to dismiss"]
```

- 目的: ブラウザアラートを廃止し、非モーダルで即時フィードバックを返すための統一コンポーネント。
- 表示位置: 右上スタック。クリック or × で閉じられ、`duration` 経過で自動フェードアウト。
- 種別: `info`=通知、`success`=完了、`error`=失敗。ユーザー操作を遮らないトーンを維持する。
- 利用指針:
  - 成功系（共有リンクコピー、更新完了など）は `success` で短めの滞留時間。
  - エラー系（API 失敗など）は `error` でやや長め（例: 5s）、詳細はインライン表示と併用可。
  - 入力バリデーションなど、フィールド近くで十分説明できる場合は通知を出さない。
- API: `showNotification(message, { type, duration })` を UI 層で呼び出す。詳細実装は `src/frontend/modules/system/notifications.ts` を参照。

## 5. Next Enhancements

- BlockNote によるブロックエディタ（フォームで編集、詳細も同一表現で表示）。
- タグオートコンプリート UI、カテゴリ固有項目に応じたフォーム切替。
- Insight Cards を可変化してカテゴリ別メトリクスやトレンドカードを追加。

この概要は README の Documentation セクションからリンクされ、UI 改修の背景を共有するための簡潔なハブとなる。
