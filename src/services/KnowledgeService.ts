import { SheetService } from './SheetService';
import { Knowledge, Comment, TagRecord, PostCategory, CategoryFormConfig } from '../types';
import { safeJsonParse, slugifyTag } from '../utils';
import { CATEGORY_FORM_CONFIGS } from '../config/categoryFormConfig';

export const KNOWLEDGE_SHEET_NAMES = {
  POSTS: 'Posts',
  TAGS: 'Tags',
  POST_TAGS: 'PostTags',
  COMMENTS: 'Comments',
  LIKES: 'Likes',
};

export const KNOWLEDGE_SHEET_HEADERS = {
  POSTS: [
    'id',
    'category',
    'title',
    'content',
    'tagsCache',
    'postedBy',
    'postedAt',
    'updatedAt',
    'likesCount',
    'thumbnailUrl',
    'status',
    'metadataJson',
  ],
  TAGS: ['id', 'name', 'slug', 'color', 'aliases', 'createdAt'],
  POST_TAGS: ['postId', 'tagId', 'createdAt'],
  COMMENTS: ['id', 'postId', 'author', 'content', 'postedAt'],
  LIKES: ['clientId', 'postId', 'likedAt'],
};

const CACHE_KEY_LIST = 'knowledge_list_cache';
const CACHE_DURATION = 21600; // 6 hours
const DEFAULT_CATEGORY: PostCategory = 'article';
const DEFAULT_STATUS = 'open';

type SheetMap = {
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  posts: GoogleAppsScript.Spreadsheet.Sheet;
  tags: GoogleAppsScript.Spreadsheet.Sheet;
  postTags: GoogleAppsScript.Spreadsheet.Sheet;
  comments: GoogleAppsScript.Spreadsheet.Sheet;
  likes: GoogleAppsScript.Spreadsheet.Sheet;
};

interface PostRow {
  id: number;
  category: PostCategory;
  title: string;
  content: string;
  tagsCache: string[];
  postedBy: string;
  postedAt: Date;
  updatedAt: Date;
  likesCount: number;
  thumbnailUrl: string;
  status: string;
  metadata: Record<string, any>;
}

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

  private static getSheets(): SheetMap {
    const spreadsheet = SheetService.openSpreadsheet();

    return {
      spreadsheet,
      posts: SheetService.getOrCreateSheet(
        KNOWLEDGE_SHEET_NAMES.POSTS,
        KNOWLEDGE_SHEET_HEADERS.POSTS,
        spreadsheet,
      ),
      tags: SheetService.getOrCreateSheet(
        KNOWLEDGE_SHEET_NAMES.TAGS,
        KNOWLEDGE_SHEET_HEADERS.TAGS,
        spreadsheet,
      ),
      postTags: SheetService.getOrCreateSheet(
        KNOWLEDGE_SHEET_NAMES.POST_TAGS,
        KNOWLEDGE_SHEET_HEADERS.POST_TAGS,
        spreadsheet,
      ),
      comments: SheetService.getOrCreateSheet(
        KNOWLEDGE_SHEET_NAMES.COMMENTS,
        KNOWLEDGE_SHEET_HEADERS.COMMENTS,
        spreadsheet,
      ),
      likes: SheetService.getOrCreateSheet(
        KNOWLEDGE_SHEET_NAMES.LIKES,
        KNOWLEDGE_SHEET_HEADERS.LIKES,
        spreadsheet,
      ),
    };
  }

  private static getSheetValues(sheet: GoogleAppsScript.Spreadsheet.Sheet): any[][] {
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow < 2 || lastColumn === 0) {
      return [];
    }
    return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  }

  private static parseDate(value: any): Date {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value;
    }
    if (typeof value === 'string' && value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  }

  private static parsePostRows(rows: any[][]): PostRow[] {
    return rows
      .map(row => {
        if (!row || row.length === 0) {
          return null;
        }
        const id = Number(row[0]);
        if (!id || Number.isNaN(id)) {
          return null;
        }
        const category = (row[1] as PostCategory) || DEFAULT_CATEGORY;
        const title = (row[2] as string) || '';
        const content = (row[3] as string) || '';
        const tagsCache = safeJsonParse<string[]>(row[4] as string, []);
        const postedBy = (row[5] as string) || '匿名';
        const postedAt = this.parseDate(row[6]);
        const updatedAt = this.parseDate(row[7]);
        const likesCount = Number(row[8]) || 0;
        const thumbnailUrl = (row[9] as string) || '';
        const status = (row[10] as string) || DEFAULT_STATUS;
        const metadata = safeJsonParse<Record<string, any>>(row[11] as string, {});

        return {
          id,
          category,
          title,
          content,
          tagsCache,
          postedBy,
          postedAt,
          updatedAt,
          likesCount,
          thumbnailUrl,
          status,
          metadata,
        };
      })
      .filter((row): row is PostRow => row !== null);
  }

  private static loadTagRecords(sheet: GoogleAppsScript.Spreadsheet.Sheet): TagRecord[] {
    const rows = this.getSheetValues(sheet);
    const tags: TagRecord[] = [];

    rows.forEach(row => {
      const id = Number(row[0]);
      if (!id || Number.isNaN(id)) {
        return;
      }
      const name = (row[1] as string) || '';
      if (!name) {
        return;
      }
      const slug = (row[2] as string) || slugifyTag(name);
      const color = (row[3] as string) || undefined;
      const aliases = safeJsonParse<string[]>(row[4] as string, []);

      tags.push({
        id,
        name,
        slug,
        color,
        aliases,
      });
    });

    return tags;
  }

  private static buildTagMap(records: TagRecord[]): Map<number, TagRecord> {
    const map = new Map<number, TagRecord>();
    records.forEach(tag => {
      map.set(tag.id, tag);
    });
    return map;
  }

  private static buildTagsByPost(
    sheet: GoogleAppsScript.Spreadsheet.Sheet,
    tagMap: Map<number, TagRecord>,
  ): Map<number, string[]> {
    const rows = this.getSheetValues(sheet);
    const tagsByPost = new Map<number, string[]>();

    rows.forEach(row => {
      const postId = Number(row[0]);
      const tagId = Number(row[1]);
      if (!postId || !tagId || Number.isNaN(postId) || Number.isNaN(tagId)) {
        return;
      }
      const tag = tagMap.get(tagId);
      if (!tag) {
        return;
      }
      const current = tagsByPost.get(postId) || [];
      current.push(tag.name);
      tagsByPost.set(postId, current);
    });

    return tagsByPost;
  }

  private static buildCommentsByPost(
    sheet: GoogleAppsScript.Spreadsheet.Sheet,
  ): Map<number, Comment[]> {
    const rows = this.getSheetValues(sheet);
    const comments = new Map<number, Comment[]>();

    rows.forEach(row => {
      const id = Number(row[0]);
      const postId = Number(row[1]);
      if (!postId || Number.isNaN(postId)) {
        return;
      }
      const author = (row[2] as string) || '匿名';
      const content = (row[3] as string) || '';
      const postedAt = this.parseDate(row[4]);

      const comment: Comment = {
        id: Number.isNaN(id) ? undefined : id,
        text: content,
        author,
        postedAt,
      };

      const current = comments.get(postId) || [];
      current.push(comment);
      comments.set(postId, current);
    });

    return comments;
  }

  private static buildKnowledgeObject(
    post: PostRow,
    tagNames: string[],
    comments: Comment[],
  ): Knowledge {
    const metadata = post.metadata || {};
    const primaryUrl =
      metadata.url || metadata.primaryUrl || metadata.demoUrl || metadata.referenceUrl || '';
    const tags = tagNames.length > 0 ? tagNames : post.tagsCache;

    return {
      id: post.id,
      title: post.title,
      url: primaryUrl,
      comment: post.content || '',
      tags,
      postedAt: new Date(post.postedAt),
      postedBy: post.postedBy,
      comments: comments.map(comment => ({
        ...comment,
        postedAt: new Date(comment.postedAt),
      })),
      thumbnailUrl: post.thumbnailUrl,
      likes: post.likesCount,
      category: post.category,
      status: post.status,
      metadata,
    };
  }

  private static getNextId(sheet: GoogleAppsScript.Spreadsheet.Sheet, columnIndex = 1): number {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return 1;
    }
    const values = sheet
      .getRange(2, columnIndex, lastRow - 1, 1)
      .getValues()
      .map(row => Number(row[0]))
      .filter(value => !Number.isNaN(value));
    const max = values.length > 0 ? Math.max(...values) : 0;
    return max + 1;
  }

  private static findRowById(sheet: GoogleAppsScript.Spreadsheet.Sheet, id: number): number | null {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return null;
    }
    const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < values.length; i++) {
      const cellValue = Number(values[i][0]);
      if (!Number.isNaN(cellValue) && cellValue === id) {
        return i + 2; // convert to sheet row (1-based, account for header)
      }
    }
    return null;
  }

  private static normalizeTagInput(tags: string | string[]): string[] {
    if (!tags) {
      return [];
    }
    if (Array.isArray(tags)) {
      return tags
        .map(tag => tag.trim())
        .filter((tag, index, arr) => tag && arr.indexOf(tag) === index);
    }
    return tags
      .split(',')
      .map(tag => tag.trim())
      .filter((tag, index, arr) => tag && arr.indexOf(tag) === index);
  }

  private static getOrCreateTagIds(
    tagNames: string[],
    sheets: SheetMap,
  ): { ids: number[]; names: string[] } {
    if (tagNames.length === 0) {
      return { ids: [], names: [] };
    }

    const tagRecords = this.loadTagRecords(sheets.tags);
    const existingBySlug = new Map<string, TagRecord>();
    tagRecords.forEach(tag => existingBySlug.set(tag.slug, tag));

    const ids: number[] = [];
    const normalizedNames: string[] = [];

    tagNames.forEach(tagName => {
      const slug = slugifyTag(tagName);
      if (!slug) {
        return;
      }
      const existing = existingBySlug.get(slug);
      if (existing) {
        ids.push(existing.id);
        normalizedNames.push(existing.name);
      } else {
        const newId = this.getNextId(sheets.tags);
        const now = new Date();
        sheets.tags.appendRow([newId, tagName, slug, '', JSON.stringify([]), now]);
        const record: TagRecord = {
          id: newId,
          name: tagName,
          slug,
          aliases: [],
        };
        existingBySlug.set(slug, record);
        ids.push(newId);
        normalizedNames.push(tagName);
      }
    });

    return { ids, names: normalizedNames };
  }

  private static replacePostTags(
    postId: number,
    tagIds: number[],
    sheet: GoogleAppsScript.Spreadsheet.Sheet,
  ) {
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = values.length - 1; i >= 0; i--) {
        const cellValue = Number(values[i][0]);
        if (!Number.isNaN(cellValue) && cellValue === postId) {
          sheet.deleteRow(i + 2);
        }
      }
    }

    tagIds.forEach(tagId => {
      sheet.appendRow([postId, tagId, new Date()]);
    });
  }

  private static assembleKnowledgeList(): Knowledge[] {
    const sheets = this.getSheets();
    const posts = this.parsePostRows(this.getSheetValues(sheets.posts));
    const tagRecords = this.loadTagRecords(sheets.tags);
    const tagMap = this.buildTagMap(tagRecords);
    const tagsByPost = this.buildTagsByPost(sheets.postTags, tagMap);
    const commentsByPost = this.buildCommentsByPost(sheets.comments);

    return posts.map(post =>
      this.buildKnowledgeObject(
        post,
        tagsByPost.get(post.id) || [],
        commentsByPost.get(post.id) || [],
      ),
    );
  }

  private static applyFilters(
    list: Knowledge[],
    filters?: {
      searchWord?: string;
      tags?: string[];
    },
  ): Knowledge[] {
    if (!filters) {
      return list;
    }
    let result = list.slice();

    if (filters.searchWord) {
      const searchLower = filters.searchWord.toLowerCase();
      result = result.filter(
        item =>
          (item.title && item.title.toLowerCase().includes(searchLower)) ||
          (item.comment && item.comment.toLowerCase().includes(searchLower)) ||
          (item.url && item.url.toLowerCase().includes(searchLower)),
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      result = result.filter(item => filters.tags!.some(tag => item.tags?.includes(tag)));
    }

    return result;
  }

  /**
   * ナレッジ一覧を取得する
   */
  static getList(filters?: { searchWord?: string; tags?: string[] }): Knowledge[] {
    try {
      const useCache =
        !filters || (!filters.searchWord && (!filters.tags || filters.tags.length === 0));

      if (useCache) {
        try {
          const cache = CacheService.getScriptCache();
          const cachedData = cache.get(CACHE_KEY_LIST);
          if (cachedData) {
            return JSON.parse(cachedData);
          }
        } catch (e) {
          console.error('Failed to get cache', e);
        }
      }

      const list = this.assembleKnowledgeList();
      if (useCache && list.length > 0) {
        try {
          CacheService.getScriptCache().put(CACHE_KEY_LIST, JSON.stringify(list), CACHE_DURATION);
        } catch (e) {
          console.error('Failed to cache data', e);
        }
      }

      return this.applyFilters(list, filters);
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
    if (!id) {
      return null;
    }
    const list = this.getList();
    const item = list.find(knowledge => knowledge.id === id);
    return item || null;
  }

  static getReferenceData(): {
    tags: TagRecord[];
    categories: CategoryFormConfig[];
  } {
    const sheets = this.getSheets();
    const tags = this.loadTagRecords(sheets.tags);
    return {
      tags,
      categories: CATEGORY_FORM_CONFIGS,
    };
  }

  /**
   * ナレッジを追加する
   */
  static add(knowledge: {
    title: string;
    url?: string;
    comment: string;
    tags: string | string[];
    postedBy: string;
    thumbnailUrl?: string;
    category?: string;
    status?: string;
    metadata?: Record<string, any>;
  }): { success: boolean; id?: number; error?: string } {
    try {
      const sheets = this.getSheets();
      const tagNames = this.normalizeTagInput(knowledge.tags);
      const { ids: tagIds, names: normalizedTagNames } = this.getOrCreateTagIds(tagNames, sheets);

      const now = new Date();
      const newId = this.getNextId(sheets.posts);
      const category = (knowledge.category as PostCategory) || DEFAULT_CATEGORY;
      const metadata = {
        url: knowledge.url || '',
        ...(knowledge.metadata || {}),
      };

      sheets.posts.appendRow([
        newId,
        category,
        knowledge.title || '',
        knowledge.comment || '',
        JSON.stringify(normalizedTagNames),
        knowledge.postedBy || '匿名',
        now,
        now,
        0,
        knowledge.thumbnailUrl || '',
        knowledge.status || DEFAULT_STATUS,
        JSON.stringify(metadata),
      ]);

      if (tagIds.length > 0) {
        tagIds.forEach(tagId => {
          sheets.postTags.appendRow([newId, tagId, now]);
        });
      }

      this.clearCache();
      return { success: true, id: newId };
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
      url?: string;
      comment: string;
      tags: string | string[];
      postedBy: string;
      thumbnailUrl?: string;
      category?: string;
      status?: string;
      metadata?: Record<string, any>;
    },
  ): { success: boolean; id?: number; error?: string } {
    try {
      const sheets = this.getSheets();
      const rowNumber = this.findRowById(sheets.posts, knowledgeId);
      if (!rowNumber) {
        return { success: false, error: 'ナレッジが見つかりません' };
      }

      const tagNames = this.normalizeTagInput(knowledge.tags);
      const { ids: tagIds, names: normalizedTagNames } = this.getOrCreateTagIds(tagNames, sheets);

      const metadata = {
        url: knowledge.url || '',
        ...(knowledge.metadata || {}),
      };

      const rowValues = sheets.posts
        .getRange(rowNumber, 1, 1, KNOWLEDGE_SHEET_HEADERS.POSTS.length)
        .getValues()[0];

      const existingPostedAt = rowValues[6] || new Date();
      const existingLikes = Number(rowValues[8]) || 0;

      sheets.posts
        .getRange(rowNumber, 2, 1, KNOWLEDGE_SHEET_HEADERS.POSTS.length - 1)
        .setValues([
          [
            (knowledge.category as PostCategory) || rowValues[1] || DEFAULT_CATEGORY,
            knowledge.title || '',
            knowledge.comment || '',
            JSON.stringify(normalizedTagNames),
            knowledge.postedBy || '匿名',
            existingPostedAt,
            new Date(),
            existingLikes,
            knowledge.thumbnailUrl || '',
            knowledge.status || rowValues[10] || DEFAULT_STATUS,
            JSON.stringify(metadata),
          ],
        ]);

      this.replacePostTags(knowledgeId, tagIds, sheets.postTags);

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
  static addComment(knowledgeId: number, comment: string, author: string): boolean {
    try {
      const sheets = this.getSheets();
      const rowNumber = this.findRowById(sheets.posts, knowledgeId);
      if (!rowNumber) {
        return false;
      }

      const newId = this.getNextId(sheets.comments);
      const now = new Date();

      sheets.comments.appendRow([newId, knowledgeId, author || '匿名', comment, now]);

      // 更新日時を更新
      sheets.posts.getRange(rowNumber, 8).setValue(now);

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
  static addLike(knowledgeId: number, clientId?: string): number {
    try {
      const sheets = this.getSheets();
      const rowNumber = this.findRowById(sheets.posts, knowledgeId);
      if (!rowNumber) {
        throw new Error('ナレッジが見つかりません');
      }

      let alreadyLiked = false;
      if (clientId) {
        const likeRows = this.getSheetValues(sheets.likes);
        alreadyLiked = likeRows.some(
          row => row[0] === clientId && Number(row[1]) === Number(knowledgeId),
        );
      }

      if (!alreadyLiked) {
        sheets.likes.appendRow([
          clientId || `anonymous-${Utilities.getUuid()}`,
          knowledgeId,
          new Date(),
        ]);
        const likesCell = sheets.posts.getRange(rowNumber, 9);
        const currentLikes = Number(likesCell.getValue()) || 0;
        likesCell.setValue(currentLikes + 1);
      }

      this.clearCache();
      return Number(sheets.posts.getRange(rowNumber, 9).getValue()) || 0;
    } catch (error) {
      console.error('Error adding like:', error);
      return 0;
    }
  }
}
