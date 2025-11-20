import { SheetService } from './SheetService';
import { parseComments } from '../utils';
import { Knowledge, Comment } from '../types';

// キャッシュキーの定数
const CACHE_KEY_LIST = 'knowledge_list_cache';
const CACHE_DURATION = 21600; // 6時間 (秒)

export class KnowledgeService {
  /**
   * キャッシュをクリアするヘルパーメソッド
   */
  private static clearCache() {
    try {
      CacheService.getScriptCache().remove(CACHE_KEY_LIST);
      console.log('Cache cleared');
    } catch (e) {
      console.error('Failed to clear cache', e);
    }
  }

  /**
   * ナレッジ一覧を取得する
   */
  static getList(filters?: {
    searchWord?: string;
    tags?: string[];
  }): Knowledge[] {
    try {
      // フィルタがない場合のみキャッシュを使用
      const useCache =
        !filters ||
        (!filters.searchWord && (!filters.tags || filters.tags.length === 0));

      if (useCache) {
        try {
          const cache = CacheService.getScriptCache();
          const cachedData = cache.get(CACHE_KEY_LIST);
          if (cachedData) {
            console.log('Returning cached data');
            return JSON.parse(cachedData);
          }
        } catch (e) {
          console.error('Failed to get cache', e);
        }
      }

      const sheet = SheetService.openSpreadsheet().getActiveSheet();

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
              tags:
                (row[3] as string)?.split(',').map((tag) => tag.trim()) || [],
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

      // フィルタがない場合はキャッシュに保存
      if (useCache && knowledgeList.length > 0) {
        try {
          // CacheServiceの上限(100KB)を考慮して、必要なら圧縮や分割が必要だが
          // ここでは単純に保存する
          CacheService.getScriptCache().put(
            CACHE_KEY_LIST,
            JSON.stringify(knowledgeList),
            CACHE_DURATION
          );
          console.log('Data cached');
        } catch (e) {
          console.error('Failed to cache data', e);
        }
      }

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

      return knowledgeList;
    } catch (error: any) {
      console.error('Error in getKnowledgeList:', error);
      console.error('Error details:', error.toString());
      console.error('Error stack:', error.stack);
      return [];
    }
  }

  /**
   * ナレッジの詳細を取得する
   */
  static getDetail(id: number): Knowledge | null {
    try {
      const sheet = SheetService.openSpreadsheet().getActiveSheet();
      const dataRange = sheet.getDataRange();

      if (!dataRange) {
        return null;
      }

      const data = dataRange.getValues();

      if (!data || data.length <= 1) {
        return null;
      }

      // ヘッダー行をスキップ
      const rows = data.slice(1);

      // IDに対応する行を直接取得（IDは行番号に対応）
      const rowIndex = id - 1; // IDは1から始まるので、インデックスに変換

      if (rowIndex < 0 || rowIndex >= rows.length) {
        return null;
      }

      const row = rows[rowIndex];

      if (!row || row.length === 0 || !row[0]) {
        return null;
      }

      // ナレッジオブジェクトを作成
      const postedAt = row[4] ? new Date(row[4] as Date) : new Date();
      const comments = parseComments((row[6] as string) || '');

      const commentsWithStringDates = comments.map((comment) => ({
        text: comment.text,
        author: comment.author,
        postedAt:
          comment.postedAt instanceof Date
            ? comment.postedAt
            : typeof comment.postedAt === 'string'
            ? new Date(comment.postedAt)
            : new Date(),
      }));

      const knowledge: Knowledge = {
        id: id,
        title: (row[0] as string) || '',
        url: (row[1] as string) || '',
        comment: (row[2] as string) || '',
        tags: (row[3] as string)?.split(',').map((tag) => tag.trim()) || [],
        postedAt: postedAt,
        postedBy: (row[5] as string) || '',
        comments: commentsWithStringDates,
        thumbnailUrl: (row[7] as string) || '',
        likes: (row[8] as number) || 0,
      };

      return knowledge;
    } catch (error: any) {
      console.error('Error in getKnowledgeDetail:', error);
      return null;
    }
  }

  /**
   * ナレッジを追加する
   */
  static add(knowledge: {
    title: string;
    url: string;
    comment: string;
    tags: string; // カンマ区切りの文字列
    postedBy: string;
    thumbnailUrl?: string;
  }): { success: boolean; id?: number; error?: string } {
    try {
      const sheet = SheetService.openSpreadsheet().getActiveSheet();

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

      // キャッシュをクリア
      this.clearCache();

      return { success: true, id: lastRow - 1 }; // IDは行番号-1（ヘッダー行を除く）
    } catch (error: any) {
      console.error('Error adding knowledge:', error);
      return { success: false, error: error.toString() };
    }
  }

  /**
   * ナレッジを更新する
   */
  static update(
    knowledgeId: number,
    knowledge: {
      title: string;
      url: string;
      comment: string;
      tags: string; // カンマ区切りの文字列
      postedBy: string;
      thumbnailUrl?: string;
    }
  ): { success: boolean; id?: number; error?: string } {
    try {
      const sheet = SheetService.openSpreadsheet().getActiveSheet();
      const rowIndex = knowledgeId; // IDは行番号に対応（ヘッダー行を除く）

      // 既存のデータを取得（コメント履歴といいね数は保持）
      const data = sheet.getDataRange().getValues();
      if (rowIndex >= data.length) {
        return {
          success: false,
          error: 'ナレッジが見つかりません',
        };
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

      // キャッシュをクリア
      this.clearCache();

      return { success: true, id: knowledgeId };
    } catch (error: any) {
      console.error('Error updating knowledge:', error);
      return { success: false, error: error.toString() };
    }
  }

  /**
   * コメントを追加する
   */
  static addComment(
    knowledgeId: number,
    comment: string,
    author: string
  ): boolean {
    try {
      const sheet = SheetService.openSpreadsheet().getActiveSheet();
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

      // キャッシュをクリア
      this.clearCache();

      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      return false;
    }
  }

  /**
   * いいねを追加する
   */
  static addLike(knowledgeId: number): number {
    try {
      const sheet = SheetService.openSpreadsheet().getActiveSheet();
      const rowIndex = knowledgeId;
      const currentLikes =
        (sheet.getRange(rowIndex + 1, 9).getValue() as number) || 0;
      const newLikes = currentLikes + 1;

      sheet.getRange(rowIndex + 1, 9).setValue(newLikes);

      // キャッシュをクリア
      this.clearCache();

      return newLikes;
    } catch (error) {
      console.error('Error adding like:', error);
      return 0;
    }
  }
}
