import { CATEGORY_CONFIG } from './constants';
import { isKnowledgeLiked } from './state';

declare const marked: any;

type KnowledgeRecord = any;

type CommentRecord = {
  author?: string;
  text?: string;
  postedAt?: Date | string;
  pending?: boolean;
  tempId?: string;
};

export function renderMarkdown(markdown: string): string {
  if (!markdown) {
    return '';
  }

  try {
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm: true,
      });
      return marked.parse(markdown);
    }
    return markdown.replace(/\n/g, '<br>');
  } catch (error) {
    console.error('Error rendering markdown:', error);
    return markdown.replace(/\n/g, '<br>');
  }
}

export function getCategoryInfo(categoryId?: string) {
  const normalized = categoryId || 'article';
  return CATEGORY_CONFIG.find((cat) => cat.id === normalized) || CATEGORY_CONFIG.find((cat) => cat.id === 'article');
}

export function renderCommentItem(comment: CommentRecord): string {
  if (!comment) {
    return '';
  }
  const date = comment.postedAt
    ? typeof comment.postedAt === 'string'
      ? new Date(comment.postedAt)
      : new Date(comment.postedAt)
    : new Date();
  const statusLabel = comment.pending
    ? '<span style="margin-left: 8px; color: #999; font-size: 0.9em;">送信中...</span>'
    : '';
  const tempAttr = comment.tempId ? `data-temp-id="${comment.tempId}"` : '';
  return `
        <div class="comment-item ${comment.pending ? 'comment-pending' : ''}" ${tempAttr}
          style="padding: 10px; margin: 10px 0; background: #f5f5f5; border-radius: 5px; opacity: ${comment.pending ? '0.6' : '1'};">
          <strong>${comment.author || '匿名'}</strong> - ${date.toLocaleString('ja-JP')} ${statusLabel}
          <div class="markdown-content" style="margin-top: 10px;">${renderMarkdown(comment.text || '')}</div>
        </div>
      `;
}

export function renderCommentsHtml(comments: CommentRecord[] = []): string {
  if (!comments || comments.length === 0) {
    return '<p>コメントはまだありません</p>';
  }
  return comments.map((comment) => renderCommentItem(comment)).join('');
}

export function createKnowledgeCard(knowledge: KnowledgeRecord): string {
  if (!knowledge) {
    return '';
  }

  const categoryInfo = getCategoryInfo(knowledge.category);
  const categoryLabel = categoryInfo ? `${categoryInfo.icon} ${categoryInfo.label}` : 'ナレッジ';
  const statusLabel = (knowledge.status || 'open').toUpperCase();
  const date = knowledge.postedAt instanceof Date ? knowledge.postedAt : new Date(knowledge.postedAt || Date.now());
  const dateStr = date.toLocaleDateString('ja-JP');
  const tags = knowledge.tags || [];
  const tagsHtml = tags
    .map((tag: string) => `<span class="card-tag">${tag}</span>`)
    .join('');
  const descriptionSource = (knowledge.comment || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  const description =
    descriptionSource.length > 0
      ? descriptionSource.length > 120
        ? `${descriptionSource.slice(0, 120)}…`
        : descriptionSource
      : '（説明なし）';

  const liked = knowledge.id ? isKnowledgeLiked(knowledge.id) : false;
  const likeButtonClass = `like-button ${liked ? 'liked' : ''}`;
  const likeButtonText = liked ? `❤️ 済 ${knowledge.likes || 0}` : `❤️ ${knowledge.likes || 0}`;
  const likeButtonDisabled = liked ? 'disabled' : '';

  const coverHtml = knowledge.thumbnailUrl
    ? `<div class="card-cover" style="background-image:url('${knowledge.thumbnailUrl}')"></div>`
    : '';

  return `
        <div class="knowledge-card" onclick="showDetail(${knowledge.id || 0})">
          ${coverHtml}
          <div class="card-header-line">
            <span class="category-badge">${categoryLabel}</span>
            <span class="status-pill">${statusLabel}</span>
          </div>
          <div class="card-title">${knowledge.title || 'タイトルなし'}</div>
          <div class="card-description">${description}</div>
          <div class="card-tags">${tagsHtml}</div>
          <div class="card-meta">
            <span>${knowledge.postedBy || '不明'}・${dateStr}</span>
            <button id="like-btn-${knowledge.id}" class="${likeButtonClass}" data-knowledge-id="${knowledge.id}"
              onclick="event.stopPropagation(); addLike(${knowledge.id || 0})" ${likeButtonDisabled}>
              ${likeButtonText}
            </button>
          </div>
        </div>
      `;
}

export function renderKnowledgeGrid(list: KnowledgeRecord[]): void {
  const grid = document.getElementById('knowledgeGrid');
  if (!grid) {
    return;
  }
  if (!list || list.length === 0) {
    grid.innerHTML = '<div class="loading">表示できるナレッジが見つかりませんでした</div>';
    return;
  }
  grid.innerHTML = list.map((k) => createKnowledgeCard(k)).join('');
}
