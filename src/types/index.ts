/**
 * ナレッジデータの型定義
 */
export type PostCategory =
  | 'article'
  | 'question'
  | 'recruitment'
  | 'showcase';

export interface KnowledgeMetadata {
  [key: string]: any;
}

export interface Knowledge {
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
  category?: PostCategory;
  status?: string;
  metadata?: KnowledgeMetadata;
  likePending?: boolean;
}

/**
 * コメントデータの型定義
 */
export interface Comment {
  id?: number;
  text: string;
  author: string;
  postedAt: Date;
  pending?: boolean;
  tempId?: string;
}

export interface TagRecord {
  id: number;
  name: string;
  slug: string;
  color?: string;
  aliases: string[];
}
