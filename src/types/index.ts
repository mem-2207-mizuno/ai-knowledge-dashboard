/**
 * ナレッジデータの型定義
 */
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
}

/**
 * コメントデータの型定義
 */
export interface Comment {
  text: string;
  author: string;
  postedAt: Date;
}
