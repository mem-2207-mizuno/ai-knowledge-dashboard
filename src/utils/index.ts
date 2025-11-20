import { Comment } from '../types';

/**
 * コメント文字列をパースするヘルパー関数
 */
export function parseComments(commentsStr: string): Comment[] {
  if (!commentsStr || commentsStr.trim() === '') {
    return [];
  }

  try {
    return JSON.parse(commentsStr);
  } catch (error) {
    return [];
  }
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value || value.trim() === '') {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    return fallback;
  }
}

export function slugifyTag(name: string): string {
  if (!name) {
    return '';
  }
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}
