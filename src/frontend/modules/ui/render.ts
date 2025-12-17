import { CATEGORY_CONFIG } from '../data/constants';
import { isKnowledgeLiked } from '../data/state';

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

function stripMarkdownPreview(text: string): string {
  if (!text) {
    return '';
  }
  // Drop code fences first to avoid leaking their contents in the preview
  let result = text.replace(/```[\s\S]*?```/g, '');
  // Images/links -> keep the label only
  result = result.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');
  result = result.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  // Inline code -> keep inner text
  result = result.replace(/`([^`]+)`/g, '$1');
  // Headings, blockquotes, lists, numbering markers
  result = result.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  result = result.replace(/^\s*>+\s?/gm, '');
  result = result.replace(/^\s*[-*+]\s+/gm, '');
  result = result.replace(/^\s*\d+\.\s+/gm, '');
  // Bold/italic markers
  result = result.replace(/(\*{1,3}|_{1,3})([^*_]+?)\1/g, '$2');
  // Remove remaining HTML tags and collapse whitespace
  result = result
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return result;
}

function extractTextFromBlockNoteBlocks(value: unknown, maxLen = 200): string {
  if (!value) return '';
  const blocks = Array.isArray(value) ? value : (value as any)?.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) return '';

  const parts: string[] = [];
  const push = (text: string) => {
    const trimmed = (text || '').replace(/\s+/g, ' ').trim();
    if (!trimmed) return;
    parts.push(trimmed);
  };

  const walkInline = (content: any) => {
    if (!content) return;
    if (typeof content === 'string') {
      push(content);
      return;
    }
    if (Array.isArray(content)) {
      content.forEach(item => walkInline(item));
      return;
    }
    if (typeof content === 'object') {
      if (typeof content.text === 'string') push(content.text);
      if (Array.isArray(content.content)) walkInline(content.content);
      return;
    }
  };

  const walkBlocks = (items: any[]) => {
    for (const block of items) {
      if (!block || typeof block !== 'object') continue;
      const type = (block as any).type;
      const props = (block as any).props || {};

      // テキスト系ブロックの中身を優先して拾う
      if (
        type === 'paragraph' ||
        type === 'heading' ||
        type === 'bulletListItem' ||
        type === 'numberedListItem'
      ) {
        walkInline((block as any).content);
      }

      // 画像だけの先頭でも、キャプション/ファイル名があれば拾う
      if (type === 'image') {
        if (typeof props.caption === 'string') push(props.caption);
        if (typeof props.name === 'string') push(props.name);
      }

      if (Array.isArray((block as any).children) && (block as any).children.length > 0) {
        walkBlocks((block as any).children);
      }

      if (parts.join(' ').length >= maxLen) {
        break;
      }
    }
  };

  walkBlocks(blocks);
  return parts.join(' ').trim();
}

function stripBlockNoteJsonPreview(text: string): string {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  const looksLikeJson = trimmed.startsWith('[') || trimmed.startsWith('{');
  if (!looksLikeJson) return '';
  try {
    const parsed = JSON.parse(trimmed);
    return extractTextFromBlockNoteBlocks(parsed, 240);
  } catch {
    return '';
  }
}

export function getCategoryInfo(categoryId?: string) {
  const normalized = categoryId || 'article';
  return (
    CATEGORY_CONFIG.find(cat => cat.id === normalized) ||
    CATEGORY_CONFIG.find(cat => cat.id === 'article')
  );
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
  return comments.map(comment => renderCommentItem(comment)).join('');
}

export function createKnowledgeCard(knowledge: KnowledgeRecord): string {
  if (!knowledge) {
    return '';
  }

  const categoryInfo = getCategoryInfo(knowledge.category);
  const categoryLabel = categoryInfo ? `${categoryInfo.icon} ${categoryInfo.label}` : 'ナレッジ';
  const statusLabel = (knowledge.status || 'open').toUpperCase();
  const date =
    knowledge.postedAt instanceof Date
      ? knowledge.postedAt
      : new Date(knowledge.postedAt || Date.now());
  const dateStr = date.toLocaleDateString('ja-JP');
  const tags = knowledge.tags || [];
  const tagsHtml = tags.map((tag: string) => `<span class="card-tag">${tag}</span>`).join('');
  const rawComment = knowledge.comment || '';
  const descriptionSource =
    stripBlockNoteJsonPreview(rawComment) || stripMarkdownPreview(rawComment);
  const description =
    descriptionSource.length > 0
      ? descriptionSource.length > 120
        ? `${descriptionSource.slice(0, 120)}…`
        : descriptionSource
      : '（説明なし）';

  const liked = knowledge.id ? isKnowledgeLiked(knowledge.id) : false;
  const likeButtonClass = `icon-button favorite-button ${liked ? 'active' : ''}`;
  const likeButtonText = `<span class="material-icons">${liked ? 'star' : 'star_border'}</span>`;

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
              onclick="event.stopPropagation(); addLike(${knowledge.id || 0})">
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
  grid.innerHTML = list.map(k => createKnowledgeCard(k)).join('');
}
