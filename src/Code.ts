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
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  const imgId = e?.parameter && typeof e.parameter.img === 'string' ? e.parameter.img.trim() : '';
  if (imgId) {
    return serveKnowledgeImage(imgId) as any;
  }

  const template = HtmlService.createTemplateFromFile('index');
  template.spreadsheetId = Config.getSpreadsheetId();

  // URLパラメータからIDを取得（数値のみを有効とする）
  let initialId: number | null = null;
  const singleIdParam = e.parameter && typeof e.parameter.id === 'string' ? e.parameter.id : null;
  const multiIdParam =
    e.parameters && e.parameters.id && Array.isArray(e.parameters.id) && e.parameters.id.length > 0
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
  const initialView = e.parameter.view === 'panel' ? 'panel' : 'modal';

  // アプリケーションのURLを取得してテンプレートに渡す
  // JSON.stringifyしない（エスケープ回避）
  // 取得できない場合は空文字をセット
  let appUrl = '';
  try {
    appUrl = ScriptApp.getService().getUrl();
  } catch (error) {
    console.error('Failed to get app URL', error);
  }

  // 初期データを取得してテンプレートに渡す（SSR的な挙動）
  // キャッシュが効いているため高速に取得できるはず
  const initialData = KnowledgeService.getList();
  const referenceData = KnowledgeService.getReferenceData();
  const serverData = {
    initialData,
    referenceData,
    initialId,
    initialView,
    appUrl,
  };
  (template as any).serverData = JSON.stringify(serverData).replace(/</g, '\\u003c');

  return template
    .evaluate()
    .setTitle('AI Knowledge Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function serveKnowledgeImage(fileId: string): GoogleAppsScript.Content.TextOutput {
  try {
    const file = DriveApp.getFileById(String(fileId).trim());
    const blob = file.getBlob();
    const contentType = blob.getContentType() || 'application/octet-stream';
    return ContentService.createTextOutput(blob.getDataAsString()).setMimeType(contentType as any);
  } catch (error) {
    console.error('Failed to serve knowledge image:', error);
    return ContentService.createTextOutput('Not Found').setMimeType(ContentService.MimeType.TEXT);
  }
}

const UPLOAD_FOLDER_ID_PROP = 'UPLOAD_FOLDER_ID';
const DEFAULT_UPLOAD_FOLDER_NAME = 'AI Knowledge Dashboard Uploads';

function getOrCreateUploadFolderId(): string {
  const props = PropertiesService.getScriptProperties();
  const existing = (props.getProperty(UPLOAD_FOLDER_ID_PROP) || '').trim();
  if (existing) {
    try {
      DriveApp.getFolderById(existing).getId();
    } catch (error: any) {
      throw new Error(
        `UPLOAD_FOLDER_ID のフォルダにアクセスできません。プロパティを更新してください。 folderId=${existing} error=${
          error?.message || error
        }`,
      );
    }
    return existing;
  }
  const folder = DriveApp.createFolder(DEFAULT_UPLOAD_FOLDER_NAME);
  props.setProperty(UPLOAD_FOLDER_ID_PROP, folder.getId());
  return folder.getId();
}

function ensureUploadFolder(folderName?: string): { folderId: string; folderUrl: string } {
  const name = (folderName || DEFAULT_UPLOAD_FOLDER_NAME).trim() || DEFAULT_UPLOAD_FOLDER_NAME;
  const props = PropertiesService.getScriptProperties();
  const existing = (props.getProperty(UPLOAD_FOLDER_ID_PROP) || '').trim();
  if (existing) {
    const folder = DriveApp.getFolderById(existing);
    return { folderId: folder.getId(), folderUrl: folder.getUrl() };
  }
  const folder = DriveApp.createFolder(name);
  props.setProperty(UPLOAD_FOLDER_ID_PROP, folder.getId());
  return { folderId: folder.getId(), folderUrl: folder.getUrl() };
}

function getKnowledgeImageData(fileId: string): { mimeType: string; base64: string } {
  const normalized = String(fileId || '').trim();
  if (!normalized) {
    throw new Error('fileIdが不正です');
  }
  const file = DriveApp.getFileById(normalized);
  const blob = file.getBlob();
  return {
    mimeType: blob.getContentType() || 'application/octet-stream',
    base64: Utilities.base64Encode(blob.getBytes()),
  };
}

function authorizeDrive(): boolean {
  DriveApp.getRootFolder().getId();
  return true;
}

function uploadKnowledgeImage(payload: { dataUrl: string; filename?: string }): string {
  if (!payload || typeof payload.dataUrl !== 'string') {
    throw new Error('アップロードデータが不正です');
  }
  const dataUrl = payload.dataUrl.trim();
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('dataURLの形式が不正です');
  }
  const mimeType = match[1];
  const base64 = match[2];
  if (!mimeType.startsWith('image/')) {
    throw new Error('画像ファイルのみアップロードできます');
  }

  const approxBytes = Math.floor((base64.length * 3) / 4);
  const maxBytes = 5 * 1024 * 1024;
  if (approxBytes > maxBytes) {
    throw new Error('画像サイズが大きすぎます（最大 5MB）');
  }

  const bytes = Utilities.base64Decode(base64);
  const safeName = (payload.filename || `image-${Date.now()}.png`).replace(/[\\/:*?"<>|]/g, '_');
  const blob = Utilities.newBlob(bytes, mimeType, safeName);
  const folderId = getOrCreateUploadFolderId();
  const file = DriveApp.getFolderById(folderId).createFile(blob);
  let isPublic = false;
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    isPublic = true;
  } catch (error1) {
    try {
      file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
      // ドメイン共有の場合、iframe/サードパーティCookie制限でDrive直リンクが表示できないケースがあるため、
      // URLは返すが、表示が403になる場合はクライアント側で再挿入（dataURL）運用に切り替える。
      isPublic = false;
    } catch (error2) {
      console.warn('Skipping setSharing due to policy/permission:', error1, error2);
      isPublic = false;
    }
  }

  // 公開リンクにできた場合のみDrive URLを返す。できない場合は dataURL を返して確実に表示させる。
  if (isPublic) {
    return `https://drive.google.com/uc?export=view&id=${file.getId()}`;
  }
  return dataUrl;
}

/**
 * ナレッジ一覧を取得するAPI
 */
function getKnowledgeList(filters?: { searchWord?: string; tags?: string[] }): string {
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

function getReferenceData(): string {
  const reference = KnowledgeService.getReferenceData();
  return JSON.stringify(reference);
}

/**
 * ナレッジを追加するAPI
 */
function addKnowledge(knowledge: {
  title: string;
  url?: string;
  comment: string;
  tags: string | string[];
  postedBy: string;
  thumbnailUrl?: string;
  category?: string;
  status?: string;
  metadata?: Record<string, any>;
  throwed?: boolean;
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
    tags: string | string[];
    postedBy: string;
    thumbnailUrl?: string;
    category?: string;
    status?: string;
    metadata?: Record<string, any>;
    throwed?: boolean;
  },
): string {
  const result = KnowledgeService.update(knowledgeId, knowledge);
  return JSON.stringify(result);
}

function toggleCommentReaction(commentId: number, emoji: string, clientId?: string): string {
  const result = KnowledgeService.toggleCommentReaction(commentId, emoji, clientId);
  return JSON.stringify(result);
}

/**
 * コメントを追加するAPI
 */
function addComment(knowledgeId: number, comment: string, author: string): boolean {
  return KnowledgeService.addComment(knowledgeId, comment, author);
}

function deleteComment(commentId: number, knowledgeId: number): boolean {
  return KnowledgeService.deleteComment(commentId, knowledgeId);
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

function include(filename: string): string {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// グローバルスコープに関数を公開（GASから呼び出せるようにする）
const globalScope = globalThis as Record<string, unknown>;
globalScope.doGet = doGet;
globalScope.getKnowledgeList = getKnowledgeList;
globalScope.getKnowledgeDetail = getKnowledgeDetail;
globalScope.getReferenceData = getReferenceData;
globalScope.addKnowledge = addKnowledge;
globalScope.updateKnowledge = updateKnowledge;
globalScope.addComment = addComment;
globalScope.deleteComment = deleteComment;
globalScope.addLike = addLike;
globalScope.testSpreadsheetAccess = testSpreadsheetAccess;
globalScope.include = include;
globalScope.toggleCommentReaction = toggleCommentReaction;
globalScope.uploadKnowledgeImage = uploadKnowledgeImage;
globalScope.authorizeDrive = authorizeDrive;
globalScope.getKnowledgeImageData = getKnowledgeImageData;
globalScope.ensureUploadFolder = ensureUploadFolder;
