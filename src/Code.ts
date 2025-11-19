/**
 * AI Knowledge Dashboard
 * メインのエントリーポイント
 */

// グローバル変数（スプレッドシートIDは後で設定）
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

/**
 * Webアプリケーションとして公開する関数
 * GETリクエストで呼び出される
 */
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  const template = HtmlService.createTemplateFromFile('index');
  template.spreadsheetId = SPREADSHEET_ID;
  return template.evaluate()
    .setTitle('AI Knowledge Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ナレッジ一覧を取得するAPI
 */
function getKnowledgeList(filters?: {
  searchWord?: string;
  tags?: string[];
}): Knowledge[] {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // ヘッダー行をスキップ
  const headers = data[0];
  const rows = data.slice(1);
  
  let knowledgeList: Knowledge[] = rows.map((row, index) => {
    return {
      id: index + 1,
      title: row[0] as string,
      url: row[1] as string,
      comment: row[2] as string,
      tags: (row[3] as string)?.split(',').map(tag => tag.trim()) || [],
      postedAt: row[4] as Date,
      postedBy: row[5] as string,
      comments: parseComments(row[6] as string),
      thumbnailUrl: row[7] as string || '',
      likes: (row[8] as number) || 0
    };
  });
  
  // フィルタリング
  if (filters) {
    if (filters.searchWord) {
      const searchLower = filters.searchWord.toLowerCase();
      knowledgeList = knowledgeList.filter(k => 
        k.title.toLowerCase().includes(searchLower) ||
        k.comment.toLowerCase().includes(searchLower) ||
        k.url.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.tags && filters.tags.length > 0) {
      knowledgeList = knowledgeList.filter(k =>
        filters.tags!.some(tag => k.tags.includes(tag))
      );
    }
  }
  
  return knowledgeList;
}

/**
 * ナレッジの詳細を取得するAPI
 */
function getKnowledgeDetail(id: number): Knowledge | null {
  const knowledgeList = getKnowledgeList();
  return knowledgeList.find(k => k.id === id) || null;
}

/**
 * コメントを追加するAPI
 */
function addComment(knowledgeId: number, comment: string, author: string): boolean {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const rowIndex = knowledgeId; // IDは行番号に対応
    
    if (rowIndex >= data.length) {
      return false;
    }
    
    const currentComments = parseComments(data[rowIndex][6] as string);
    const newComment: Comment = {
      text: comment,
      author: author,
      postedAt: new Date()
    };
    currentComments.push(newComment);
    
    // コメント列（7列目、インデックス6）を更新
    sheet.getRange(rowIndex + 1, 7).setValue(JSON.stringify(currentComments));
    
    return true;
  } catch (error) {
    console.error('Error adding comment:', error);
    return false;
  }
}

/**
 * いいねを追加するAPI
 */
function addLike(knowledgeId: number): number {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const rowIndex = knowledgeId;
    const currentLikes = sheet.getRange(rowIndex + 1, 9).getValue() as number || 0;
    const newLikes = currentLikes + 1;
    
    sheet.getRange(rowIndex + 1, 9).setValue(newLikes);
    
    return newLikes;
  } catch (error) {
    console.error('Error adding like:', error);
    return 0;
  }
}

/**
 * コメント文字列をパースするヘルパー関数
 */
function parseComments(commentsStr: string): Comment[] {
  if (!commentsStr || commentsStr.trim() === '') {
    return [];
  }
  
  try {
    return JSON.parse(commentsStr);
  } catch (error) {
    return [];
  }
}

/**
 * 型定義
 */
interface Knowledge {
  id: number;
  title: string;
  url: string;
  comment: string;
  tags: string[];
  postedAt: Date;
  postedBy: string;
  comments: Comment[];
  thumbnailUrl: string;
  likes: number;
}

interface Comment {
  text: string;
  author: string;
  postedAt: Date;
}

