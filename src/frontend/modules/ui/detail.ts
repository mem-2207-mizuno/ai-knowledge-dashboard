import { renderMarkdown, renderCommentsHtml, getCategoryInfo } from './render';
import {
  findKnowledgeById,
  appendOptimisticComment,
  removeOptimisticCommentFromState,
  confirmOptimisticCommentInState,
  isKnowledgeLiked,
  markKnowledgeLiked,
  getAllKnowledge,
  setAllKnowledge,
} from '../data/state';
import { postComment, postLike } from '../data/api';
import { renderReadonlyMarkdown } from './editors';
import { CATEGORY_FORM_CONFIGS } from '../data/constants';

const LIKES_BUTTON_PREFIX = 'like-btn-';
const MODAL_LIKE_BUTTON_PREFIX = 'modal-like-btn-';

function renderMetadataSection(knowledge: any): string {
  const categoryKey = knowledge?.category;
  const config = CATEGORY_FORM_CONFIGS.find(cat => cat.key === categoryKey);
  const metadata = knowledge?.metadata || {};
  if (!config || !config.metadataFields || config.metadataFields.length === 0) {
    return '';
  }

  const items = config.metadataFields
    .map(field => {
      const value = metadata[field.key];
      if (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return '';
      }
      const display =
        Array.isArray(value) && value.length > 0 ? value.join(', ') : String(value).trim();
      return `<div class="detail-meta-item"><span class="detail-meta-label">${field.label}</span><span class="detail-meta-value">${display}</span></div>`;
    })
    .filter(Boolean)
    .join('');

  if (!items) {
    return '';
  }

  return `
    <div class="detail-meta-block">
      <div class="detail-meta-title">カテゴリ固有の項目</div>
      <div class="detail-meta-list">${items}</div>
    </div>
  `;
}

export function refreshCommentsUI(knowledgeId: number) {
  const knowledge = findKnowledgeById(knowledgeId);
  if (!knowledge) {
    return;
  }
  const commentsList = document.getElementById('commentsList');
  if (!commentsList) {
    return;
  }
  const comments = Array.isArray(knowledge.comments) ? knowledge.comments : [];
  commentsList.innerHTML = renderCommentsHtml(comments);
}

export function updateLikeDisplay(knowledgeId: number, likes: number, pending = false) {
  const liked = isKnowledgeLiked(knowledgeId);
  const cardBtn = document.getElementById(`${LIKES_BUTTON_PREFIX}${knowledgeId}`);
  if (cardBtn) {
    cardBtn.textContent = liked ? `❤️ 済 ${likes}` : `❤️ ${likes}`;
    cardBtn.classList.toggle('liked', liked);
    (cardBtn as HTMLButtonElement).disabled = liked || pending;
    (cardBtn as HTMLButtonElement).style.opacity = pending ? '0.6' : '1';
  }

  const modalBtn = document.getElementById(`${MODAL_LIKE_BUTTON_PREFIX}${knowledgeId}`);
  if (modalBtn) {
    modalBtn.textContent = liked ? `❤️ いいね済 ${likes}` : `❤️ いいね ${likes}`;
    modalBtn.classList.toggle('liked', liked);
    (modalBtn as HTMLButtonElement).disabled = liked || pending;
    (modalBtn as HTMLButtonElement).style.opacity = pending ? '0.6' : '1';
  }
}

export function displayDetail(knowledge: any) {
  if (!knowledge || knowledge === null) {
    throw new Error('ナレッジが見つかりませんでした');
  }

  const list = getAllKnowledge();
  const localIndex = list.findIndex(k => k.id == knowledge.id);
  if (localIndex === -1) {
    list.push(knowledge);
  } else {
    list[localIndex] = knowledge;
  }
  setAllKnowledge(list);

  const modal = document.getElementById('detailModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  let modalActions = document.getElementById('modalActions');
  if (!modal || !modalTitle || !modalBody) {
    throw new Error('モーダルを描画できませんでした');
  }
  if (!modalActions) {
    const header = modal.querySelector('.modal-header');
    if (!header) {
      throw new Error('モーダルを描画できませんでした');
    }
    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'modal-actions';
    modalActions = document.createElement('div');
    modalActions.id = 'modalActions';
    actionsWrapper.appendChild(modalActions);
    header.appendChild(actionsWrapper);
  }

  modalTitle.textContent = knowledge.title;

  const date = knowledge.postedAt
    ? typeof knowledge.postedAt === 'string'
      ? new Date(knowledge.postedAt)
      : new Date(knowledge.postedAt)
    : new Date();
  const dateStr = `${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP')}`;

  const categoryInfo = getCategoryInfo(knowledge.category);
  const categoryLabel = categoryInfo ? `${categoryInfo.icon} ${categoryInfo.label}` : 'ナレッジ';
  const statusLabel = (knowledge.status || 'open').toUpperCase();

  const tagsHtml = (knowledge.tags || [])
    .map((tag: string) => `<span class="card-tag">${tag}</span>`)
    .join('');
  const metadataHtml = renderMetadataSection(knowledge);
  const urlValue = knowledge.url
    ? `<a href="${knowledge.url}" target="_blank">${knowledge.url}</a>`
    : 'URLは登録されていません';

  const commentsArray = Array.isArray(knowledge.comments) ? knowledge.comments : [];
  const commentsHtml = renderCommentsHtml(commentsArray);
  const isLiked = knowledge.id ? isKnowledgeLiked(knowledge.id) : false;
  const likesCount = knowledge.likes || 0;
  const modalLikeClass = `icon-button ${isLiked ? 'active' : ''}`;
  const knowledgeUrl = knowledge.url || '';
  const urlMarkup = knowledgeUrl
    ? `<a href="${knowledgeUrl}" target="_blank">${knowledgeUrl}</a>`
    : 'URLは登録されていません';

  modalBody.innerHTML = `
        <div style="display:flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px;">
          <span class="category-badge">${categoryLabel}</span>
          <span class="status-pill">${statusLabel}</span>
        </div>
        ${knowledge.thumbnailUrl ? `<img src="${knowledge.thumbnailUrl}" alt="${knowledge.title}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 5px; margin-bottom: 20px;">` : ''}
        <div class="detail-property-list">
          <div class="property-row">
            <div class="property-label">参照URL</div>
            <div class="property-control"><div class="property-value">${urlValue}</div></div>
          </div>
          <div class="property-row">
            <div class="property-label">投稿者</div>
            <div class="property-control"><div class="property-value">${knowledge.postedBy || '不明'}</div></div>
          </div>
          <div class="property-row">
            <div class="property-label">投稿日時</div>
            <div class="property-control"><div class="property-value">${dateStr}</div></div>
          </div>
          <div class="property-row">
            <div class="property-label">タグ</div>
            <div class="property-control"><div class="card-tags">${tagsHtml || '<span class="property-value">なし</span>'}</div></div>
          </div>
        </div>
        ${metadataHtml}
        <p><strong>説明:</strong></p>
        <div id="knowledgeDetailBody" class="blocknote-shell readonly"></div>
        <div style="margin: 20px 0;">
          <h3>コメント</h3>
          <div id="commentsList">${commentsHtml}</div>
          <div style="margin-top: 20px;">
            <input type="text" id="newComment" placeholder="コメントを入力..." style="width: 70%; padding: 10px; border: 2px solid #ddd; border-radius: 5px;">
            <input type="text" id="commentAuthor" placeholder="お名前" style="width: 20%; padding: 10px; border: 2px solid #ddd; border-radius: 5px; margin-left: 10px;">
            <button onclick="submitComment(${knowledge.id})" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">投稿</button>
          </div>
        </div>
      `;

  modal.classList.add('active');
  updateLikeDisplay(knowledge.id, knowledge.likes, knowledge.likePending);
  renderReadonlyMarkdown('knowledgeDetailBody', knowledge.comment || '（説明なし）');

  modalActions.innerHTML = `
    <div class="icon-button-group">
      <button id="modal-like-btn-${knowledge.id}" class="${modalLikeClass}" onclick="addLike(${knowledge.id})" title="お気に入り">
        <span class="material-icons">${isLiked ? 'star' : 'star_border'}</span>
      </button>
      <button class="icon-button" onclick="copyShareLink(${knowledge.id})" title="リンクをコピー">
        <span class="material-icons">link</span>
      </button>
      <button class="icon-button" onclick="openEditModal(${knowledge.id})" title="編集">
        <span class="material-icons">edit</span>
      </button>
    </div>
  `;
}

export function closeDetailModal() {
  const url = new URL(window.location.href);
  if (url.searchParams.has('id')) {
    url.searchParams.delete('id');
    window.history.pushState({ id: null }, '', url.pathname + url.search);
  }
  const modal = document.getElementById('detailModal');
  modal?.classList.remove('active');
}

export function copyShareLink(id: number) {
  const baseUrl = (window as any).SERVER_DATA?.appUrl || window.location.href.split('?')[0];
  const shareUrl = `${baseUrl}?id=${id}`;
  navigator.clipboard
    .writeText(shareUrl)
    .then(() => alert(`共有用URLをクリップボードにコピーしました！\n${shareUrl}`))
    .catch(err => {
      console.error('Failed to copy:', err);
      prompt('以下のURLをコピーしてください:', shareUrl);
    });
}

export function submitComment(
  knowledgeId: number,
  options: {
    onSuccess: () => void;
    onError: (message: string) => void;
    onUpdate?: () => void;
  },
) {
  const commentInput = document.getElementById('newComment') as HTMLInputElement | null;
  const authorInput = document.getElementById('commentAuthor') as HTMLInputElement | null;
  if (!commentInput) {
    options.onError('コメント入力欄が見つかりません');
    return;
  }
  const commentText = commentInput.value;
  const author = authorInput?.value || '匿名';
  if (!commentText.trim()) {
    options.onError('コメントを入力してください');
    return;
  }
  const tempId = `temp-${knowledgeId}-${Date.now()}`;
  appendOptimisticComment(knowledgeId, {
    tempId,
    text: commentText,
    author,
    postedAt: new Date(),
    pending: true,
  });
  refreshCommentsUI(knowledgeId);
  options.onUpdate?.();
  commentInput.value = '';
  if (authorInput) {
    authorInput.value = '';
  }
  postComment(
    knowledgeId,
    commentText,
    author,
    success => {
      if (success) {
        confirmOptimisticCommentInState(knowledgeId, tempId);
        refreshCommentsUI(knowledgeId);
        options.onUpdate?.();
        options.onSuccess();
      } else {
        removeOptimisticCommentFromState(knowledgeId, tempId);
        refreshCommentsUI(knowledgeId);
        options.onError('コメントの投稿に失敗しました');
      }
    },
    error => {
      removeOptimisticCommentFromState(knowledgeId, tempId);
      refreshCommentsUI(knowledgeId);
      console.error(error);
      options.onError(error?.message || 'コメントの投稿に失敗しました');
    },
  );
}

export function addLike(
  knowledgeId: number,
  clientId: string,
  options: {
    onSuccess: () => void;
    onError: (message: string) => void;
    onUpdate?: () => void;
  },
) {
  const knowledge = findKnowledgeById(knowledgeId);
  if (!knowledge) {
    options.onError('ナレッジが見つかりませんでした');
    return;
  }
  if (isKnowledgeLiked(knowledgeId) || knowledge.likePending) {
    return;
  }
  const originalLikes = knowledge.likes || 0;
  knowledge.likePending = true;
  knowledge.likes = originalLikes + 1;
  updateLikeDisplay(knowledgeId, knowledge.likes, true);

  postLike(
    knowledgeId,
    clientId,
    newLikes => {
      knowledge.likes = newLikes;
      knowledge.likePending = false;
      markKnowledgeLiked(knowledgeId);
      updateLikeDisplay(knowledgeId, newLikes, false);
      options.onUpdate?.();
      options.onSuccess();
    },
    error => {
      console.error('Error adding like:', error);
      knowledge.likes = originalLikes;
      knowledge.likePending = false;
      updateLikeDisplay(knowledgeId, originalLikes, false);
      options.onUpdate?.();
      options.onError(error?.message || 'いいねの追加に失敗しました');
    },
  );
}
