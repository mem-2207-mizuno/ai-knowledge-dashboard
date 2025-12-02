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
  } catch {
    return [];
  }
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value || value.trim() === '') {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function slugifyTag(name: string): string {
  if (!name) {
    return '';
  }
  const normalized = name.trim().toLowerCase().normalize('NFKC');
  const slug = normalized.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');
  if (slug) {
    return slug;
  }
  // If the string becomes empty (e.g. entirely symbols), fall back to a whitespace-normalized version
  return normalized.replace(/\s+/g, '-');
}
