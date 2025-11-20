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

  // URLパラメータからIDを取得（数値のみを有効とする）
  let initialId: number | null = null;
  const singleIdParam =
    e.parameter && typeof e.parameter.id === 'string' ? e.parameter.id : null;
  const multiIdParam =
    e.parameters &&
    e.parameters.id &&
    Array.isArray(e.parameters.id) &&
    e.parameters.id.length > 0
      ? e.parameters.id[0]
      : null;
  const candidateId = singleIdParam || multiIdParam;

  if (candidateId) {
    const trimmedId = candidateId.trim();
    if (/^\d+$/.test(trimmedId)) {
      initialId = parseInt(trimmedId, 10);
    } else {
      console.log(`Ignoring non-numeric id parameter: ${trimmedId}`);
    }
  }

  // nullの場合は 'null' という文字列ではなく null そのものを渡すが、
  // テンプレートエンジンでの評価エラーを避けるため、テンプレート側での参照は慎重に行う必要がある
  (template as any).initialId = initialId;

  // アプリケーションのURLを取得してテンプレートに渡す
  // JSON.stringifyしない（エスケープ回避）
  // 取得できない場合は空文字をセット
  try {
    (template as any).appUrl = ScriptApp.getService().getUrl();
  } catch (e) {
    console.error('Failed to get app URL', e);
    (template as any).appUrl = '';
  }

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
  url?: string;
  comment: string;
  tags: string;
  postedBy: string;
  thumbnailUrl?: string;
  category?: string;
  status?: string;
  metadata?: Record<string, any>;
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
    url?: string;
    comment: string;
    tags: string;
    postedBy: string;
    thumbnailUrl?: string;
    category?: string;
    status?: string;
    metadata?: Record<string, any>;
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
function addLike(knowledgeId: number, clientId?: string): number {
  return KnowledgeService.addLike(knowledgeId, clientId);
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
