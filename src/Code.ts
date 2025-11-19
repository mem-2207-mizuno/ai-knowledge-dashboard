/**
 * AI Knowledge Dashboard
 * メインのエントリーポイント
 */

/**
 * スプレッドシートIDを取得（Script Propertiesから）
 * GASエディタで「プロジェクトの設定」→「スクリプト プロパティ」から設定してください
 */
function getSpreadsheetId(): string {
  const spreadsheetId =
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error(
      'SPREADSHEET_IDが設定されていません。GASエディタの「プロジェクトの設定」→「スクリプト プロパティ」から設定してください。'
    );
  }
  // 前後の空白を削除
  return spreadsheetId.trim();
}

/**
 * スプレッドシートを安全に開く
 */
function openSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const spreadsheetId = getSpreadsheetId();

  try {
    // まずIDが有効な形式か確認
    if (!spreadsheetId || spreadsheetId.trim().length === 0) {
      throw new Error('スプレッドシートIDが空です');
    }

    // スプレッドシートを開く
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId.trim());

    return spreadsheet;
  } catch (error: any) {
    const errorMessage = error?.toString() || 'Unknown error';
    console.error('Error opening spreadsheet:', errorMessage);

    // より詳細なエラーメッセージ
    let detailedError = `スプレッドシートを開けませんでした。\n`;
    detailedError += `エラー: ${errorMessage}\n\n`;
    detailedError += `確認事項:\n`;
    detailedError += `1. スプレッドシートIDが正しいか確認してください\n`;
    detailedError += `2. スプレッドシートが存在するか確認してください\n`;
    detailedError += `3. デプロイ時の実行ユーザーがスプレッドシートにアクセスできるか確認してください\n`;
    detailedError += `4. スプレッドシートの共有設定を確認してください`;

    throw new Error(detailedError);
  }
}

/**
 * Webアプリケーションとして公開する関数
 * GETリクエストで呼び出される
 */
function doGet(
  e: GoogleAppsScript.Events.DoGet
): GoogleAppsScript.HTML.HtmlOutput {
  const template = HtmlService.createTemplateFromFile('index');
  template.spreadsheetId = getSpreadsheetId();
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
}): Knowledge[] {
  try {
    const sheet = openSpreadsheet().getActiveSheet();

    // データ範囲を取得
    const dataRange = sheet.getDataRange();
    if (!dataRange) {
      console.log('Data range is empty, returning empty array');
      return [];
    }

    const data = dataRange.getValues();
    console.log('Data rows count:', data ? data.length : 0);

    // データが空の場合
    if (!data || data.length === 0) {
      console.log('No data in spreadsheet, returning empty array');
      return [];
    }

    // ヘッダー行のみの場合
    if (data.length === 1) {
      console.log('Only header row exists, returning empty array');
      return [];
    }

    // ヘッダー行をスキップ
    const headers = data[0];
    const rows = data.slice(1);
    console.log('Processing rows:', rows.length);

    let knowledgeList: any[] = rows
      .filter((row) => row && row.length > 0 && row[0]) // 空行を除外
      .map((row, index) => {
        try {
          // Dateオブジェクトを文字列に変換（Webアプリでのシリアライズ問題を回避）
          const postedAt = row[4] ? new Date(row[4] as Date) : new Date();
          const comments = parseComments((row[6] as string) || '');

          // コメントのDateも文字列に変換
          const commentsWithStringDates = comments.map((comment) => ({
            text: comment.text,
            author: comment.author,
            postedAt:
              comment.postedAt instanceof Date
                ? comment.postedAt.toISOString()
                : typeof comment.postedAt === 'string'
                ? comment.postedAt
                : new Date().toISOString(),
          }));

          return {
            id: index + 1,
            title: (row[0] as string) || '',
            url: (row[1] as string) || '',
            comment: (row[2] as string) || '',
            tags: (row[3] as string)?.split(',').map((tag) => tag.trim()) || [],
            postedAt: postedAt.toISOString(), // DateをISO文字列に変換
            postedBy: (row[5] as string) || '',
            comments: commentsWithStringDates,
            thumbnailUrl: (row[7] as string) || '',
            likes: (row[8] as number) || 0,
          };
        } catch (error) {
          console.error('Error parsing row:', row, error);
          return null;
        }
      })
      .filter((item) => item !== null); // nullを除外

    console.log('Knowledge list created, count:', knowledgeList.length);

    // フィルタリング
    if (filters) {
      if (filters.searchWord) {
        const searchLower = filters.searchWord.toLowerCase();
        knowledgeList = knowledgeList.filter(
          (k) =>
            k.title.toLowerCase().includes(searchLower) ||
            k.comment.toLowerCase().includes(searchLower) ||
            k.url.toLowerCase().includes(searchLower)
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        knowledgeList = knowledgeList.filter((k) =>
          filters.tags!.some((tag) => k.tags.includes(tag))
        );
      }
    }

    console.log('Returning knowledge list, count:', knowledgeList.length);

    // Webアプリでのシリアライズ問題を回避するため、JSON文字列として返す
    // フロントエンド側でパースする
    return JSON.stringify(knowledgeList) as any;
  } catch (error: any) {
    console.error('Error in getKnowledgeList:', error);
    console.error('Error details:', error.toString());
    console.error('Error stack:', error.stack);
    // エラーが発生した場合でも空配列を返す（JSON文字列として）
    return JSON.stringify([]) as any;
  }
}

/**
 * ナレッジの詳細を取得するAPI
 */
function getKnowledgeDetail(id: number): string {
  try {
    const sheet = openSpreadsheet().getActiveSheet();
    const dataRange = sheet.getDataRange();

    if (!dataRange) {
      return JSON.stringify(null);
    }

    const data = dataRange.getValues();

    if (!data || data.length <= 1) {
      return JSON.stringify(null);
    }

    // ヘッダー行をスキップ
    const rows = data.slice(1);

    // IDに対応する行を直接取得（IDは行番号に対応）
    const rowIndex = id - 1; // IDは1から始まるので、インデックスに変換

    if (rowIndex < 0 || rowIndex >= rows.length) {
      return JSON.stringify(null);
    }

    const row = rows[rowIndex];

    if (!row || row.length === 0 || !row[0]) {
      return JSON.stringify(null);
    }

    // ナレッジオブジェクトを作成
    const postedAt = row[4] ? new Date(row[4] as Date) : new Date();
    const comments = parseComments((row[6] as string) || '');

    const commentsWithStringDates = comments.map((comment) => ({
      text: comment.text,
      author: comment.author,
      postedAt:
        comment.postedAt instanceof Date
          ? comment.postedAt.toISOString()
          : typeof comment.postedAt === 'string'
          ? comment.postedAt
          : new Date().toISOString(),
    }));

    const knowledge = {
      id: id,
      title: (row[0] as string) || '',
      url: (row[1] as string) || '',
      comment: (row[2] as string) || '',
      tags: (row[3] as string)?.split(',').map((tag) => tag.trim()) || [],
      postedAt: postedAt.toISOString(),
      postedBy: (row[5] as string) || '',
      comments: commentsWithStringDates,
      thumbnailUrl: (row[7] as string) || '',
      likes: (row[8] as number) || 0,
    };

    return JSON.stringify(knowledge);
  } catch (error: any) {
    console.error('Error in getKnowledgeDetail:', error);
    return JSON.stringify(null);
  }
}

/**
 * コメントを追加するAPI
 */
function addComment(
  knowledgeId: number,
  comment: string,
  author: string
): boolean {
  try {
    const sheet = openSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const rowIndex = knowledgeId; // IDは行番号に対応

    if (rowIndex >= data.length) {
      return false;
    }

    const currentComments = parseComments(data[rowIndex][6] as string);
    const newComment: Comment = {
      text: comment,
      author: author,
      postedAt: new Date(),
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
    const sheet = openSpreadsheet().getActiveSheet();
    const rowIndex = knowledgeId;
    const currentLikes =
      (sheet.getRange(rowIndex + 1, 9).getValue() as number) || 0;
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

/**
 * ナレッジを追加するAPI
 */
function addKnowledge(knowledge: {
  title: string;
  url: string;
  comment: string;
  tags: string; // カンマ区切りの文字列
  postedBy: string;
  thumbnailUrl?: string;
}): string {
  try {
    const sheet = openSpreadsheet().getActiveSheet();

    // 新しい行のデータを準備
    const now = new Date();
    const tags = knowledge.tags || '';
    const thumbnailUrl = knowledge.thumbnailUrl || '';
    const newRow = [
      knowledge.title || '',
      knowledge.url || '',
      knowledge.comment || '',
      tags,
      now, // 投稿日時
      knowledge.postedBy || '匿名',
      '[]', // コメント履歴（初期値は空配列のJSON）
      thumbnailUrl,
      0, // いいね数（初期値は0）
    ];

    // スプレッドシートに追加（ヘッダー行の次に追加）
    sheet.appendRow(newRow);

    // 追加した行番号を取得
    const lastRow = sheet.getLastRow();

    return JSON.stringify({ success: true, id: lastRow - 1 }); // IDは行番号-1（ヘッダー行を除く）
  } catch (error: any) {
    console.error('Error adding knowledge:', error);
    return JSON.stringify({ success: false, error: error.toString() });
  }
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
    tags: string; // カンマ区切りの文字列
    postedBy: string;
    thumbnailUrl?: string;
  }
): string {
  try {
    const sheet = openSpreadsheet().getActiveSheet();
    const rowIndex = knowledgeId; // IDは行番号に対応（ヘッダー行を除く）

    // 既存のデータを取得（コメント履歴といいね数は保持）
    const data = sheet.getDataRange().getValues();
    if (rowIndex >= data.length) {
      return JSON.stringify({
        success: false,
        error: 'ナレッジが見つかりません',
      });
    }

    const existingRow = data[rowIndex + 1]; // +1はヘッダー行のため
    const existingComments = existingRow[6] || '[]'; // コメント履歴
    const existingLikes = existingRow[8] || 0; // いいね数
    const existingPostedAt = existingRow[4] || new Date(); // 投稿日時（変更しない）

    // 更新するデータを準備
    const tags = knowledge.tags || '';
    const thumbnailUrl = knowledge.thumbnailUrl || '';
    const updatedRow = [
      knowledge.title || '',
      knowledge.url || '',
      knowledge.comment || '',
      tags,
      existingPostedAt, // 投稿日時は変更しない
      knowledge.postedBy || '匿名',
      existingComments, // コメント履歴は保持
      thumbnailUrl,
      existingLikes, // いいね数は保持
    ];

    // スプレッドシートを更新
    const range = sheet.getRange(rowIndex + 1, 1, 1, updatedRow.length);
    range.setValues([updatedRow]);

    return JSON.stringify({ success: true, id: knowledgeId });
  } catch (error: any) {
    console.error('Error updating knowledge:', error);
    return JSON.stringify({ success: false, error: error.toString() });
  }
}

/**
 * デバッグ用: スプレッドシートへのアクセステスト
 */
function testSpreadsheetAccess(): string {
  try {
    const spreadsheetId = getSpreadsheetId();
    const spreadsheet = openSpreadsheet();
    const name = spreadsheet.getName();
    return `Success! Spreadsheet ID: ${spreadsheetId}, Name: ${name}`;
  } catch (error: any) {
    return `Error: ${error.toString()}`;
  }
}
