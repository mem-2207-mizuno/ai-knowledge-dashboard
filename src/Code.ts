import { Config } from './config/Config';
import { SheetService } from './services/SheetService';
import { KnowledgeService } from './services/KnowledgeService';

/**
 * AI Knowledge Dashboard
 * メインのエントリーポイント
 */

/**
 * Webアプリケーションとして公開する関数
 * GETリクエストで呼び出される
 */
function doGet(
  e: GoogleAppsScript.Events.DoGet
): GoogleAppsScript.HTML.HtmlOutput {
  const template = HtmlService.createTemplateFromFile('index');
  template.spreadsheetId = Config.getSpreadsheetId();

  // 初期データを取得してテンプレートに渡す（SSR的な挙動）
  // キャッシュが効いているため高速に取得できるはず
  const initialData = KnowledgeService.getList();
  (template as any).initialData = JSON.stringify(initialData);

  return template
    .evaluate()
    .setTitle('AI Knowledge Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ナレッジ一覧を取得するAPI
 */
function getKnowledgeList(filters?: {
  searchWord?: string;
  tags?: string[];
}): string {
  // 戻り値をJSON文字列に変更
  const list = KnowledgeService.getList(filters);
  return JSON.stringify(list);
}

/**
 * ナレッジの詳細を取得するAPI
 */
function getKnowledgeDetail(id: number): string {
  const detail = KnowledgeService.getDetail(id);
  return JSON.stringify(detail);
}

/**
 * ナレッジを追加するAPI
 */
function addKnowledge(knowledge: {
  title: string;
  url: string;
  comment: string;
  tags: string;
  postedBy: string;
  thumbnailUrl?: string;
}): string {
  const result = KnowledgeService.add(knowledge);
  return JSON.stringify(result);
}

/**
 * ナレッジを更新するAPI
 */
function updateKnowledge(
  knowledgeId: number,
  knowledge: {
    title: string;
    url: string;
    comment: string;
    tags: string;
    postedBy: string;
    thumbnailUrl?: string;
  }
): string {
  const result = KnowledgeService.update(knowledgeId, knowledge);
  return JSON.stringify(result);
}

/**
 * コメントを追加するAPI
 */
function addComment(
  knowledgeId: number,
  comment: string,
  author: string
): boolean {
  return KnowledgeService.addComment(knowledgeId, comment, author);
}

/**
 * いいねを追加するAPI
 */
function addLike(knowledgeId: number): number {
  return KnowledgeService.addLike(knowledgeId);
}

/**
 * デバッグ用: スプレッドシートへのアクセステスト
 */
function testSpreadsheetAccess(): string {
  return SheetService.testAccess();
}

// グローバルスコープに関数を公開（GASから呼び出せるようにする）
(global as any).doGet = doGet;
(global as any).getKnowledgeList = getKnowledgeList;
(global as any).getKnowledgeDetail = getKnowledgeDetail;
(global as any).addKnowledge = addKnowledge;
(global as any).updateKnowledge = updateKnowledge;
(global as any).addComment = addComment;
(global as any).addLike = addLike;
(global as any).testSpreadsheetAccess = testSpreadsheetAccess;
