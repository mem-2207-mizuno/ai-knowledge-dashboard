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
