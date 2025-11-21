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
import { postComment, postLike, fetchKnowledgeDetail } from '../data/api';

const LIKES_BUTTON_PREFIX = 'like-btn-';
const MODAL_LIKE_BUTTON_PREFIX = 'modal-like-btn-';

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
  const localIndex = list.findIndex((k) => k.id == knowledge.id);
  if (localIndex === -1) {
    list.push(knowledge);
  } else {
    list[localIndex] = knowledge;
  }
  setAllKnowledge(list);

  const modal = document.getElementById('detailModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  if (!modal || !modalTitle || !modalBody) {
    throw new Error('モーダルを描画できませんでした');
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

  const commentsArray = Array.isArray(knowledge.comments) ? knowledge.comments : [];
  const commentsHtml = renderCommentsHtml(commentsArray);
  const isLiked = knowledge.id ? isKnowledgeLiked(knowledge.id) : false;
  const likesCount = knowledge.likes || 0;
  const modalLikeLabel = isLiked ? `❤️ いいね済 ${likesCount}` : `❤️ いいね ${likesCount}`;
  const modalLikeClass = `like-button ${isLiked ? 'liked' : ''}`;
  const modalLikeDisabled = isLiked ? 'disabled' : '';
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
        <p><strong>URL:</strong> ${urlMarkup}</p>
        <p><strong>投稿者:</strong> ${knowledge.postedBy}</p>
        <p><strong>投稿日時:</strong> ${dateStr}</p>
        <div class="card-tags" style="margin: 15px 0;">${tagsHtml}</div>
        <p><strong>説明:</strong></p>
        <div class="markdown-content">${renderMarkdown(knowledge.comment || '（説明なし）')}</div>
        <div style="margin: 20px 0;">
          <h3>コメント</h3>
          <div id="commentsList">${commentsHtml}</div>
          <div style="margin-top: 20px;">
            <input type="text" id="newComment" placeholder="コメントを入力..." style="width: 70%; padding: 10px; border: 2px solid #ddd; border-radius: 5px;">
            <input type="text" id="commentAuthor" placeholder="お名前" style="width: 20%; padding: 10px; border: 2px solid #ddd; border-radius: 5px; margin-left: 10px;">
            <button onclick="submitComment(${knowledge.id})" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">投稿</button>
          </div>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button id="modal-like-btn-${knowledge.id}" class="${modalLikeClass}" onclick="addLike(${knowledge.id})" style="flex: 1;" ${modalLikeDisabled}>
            ${modalLikeLabel}
          </button>
          <button onclick="copyShareLink(${knowledge.id})" style="padding: 10px 20px; background: #f5f5f5; color: #333; border: 1px solid #ddd; border-radius: 5px; cursor: pointer; font-size: 16px;">
             🔗 リンクをコピー
          </button>
          <button onclick="openEditModal(${knowledge.id})" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold;">
            編集
          </button>
        </div>
      `;

  modal.classList.add('active');
  updateLikeDisplay(knowledge.id, knowledge.likes, knowledge.likePending);
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
    .catch((err) => {
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
  }
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
    (success) => {
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
    (error) => {
      removeOptimisticCommentFromState(knowledgeId, tempId);
      refreshCommentsUI(knowledgeId);
      console.error(error);
      options.onError(error?.message || 'コメントの投稿に失敗しました');
    }
  );
}

export function addLike(
  knowledgeId: number,
  clientId: string,
  options: {
    onSuccess: () => void;
    onError: (message: string) => void;
    onUpdate?: () => void;
  }
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
    (newLikes) => {
      knowledge.likes = newLikes;
      knowledge.likePending = false;
      markKnowledgeLiked(knowledgeId);
      updateLikeDisplay(knowledgeId, newLikes, false);
      options.onUpdate?.();
      options.onSuccess();
    },
    (error) => {
      console.error('Error adding like:', error);
      knowledge.likes = originalLikes;
      knowledge.likePending = false;
      updateLikeDisplay(knowledgeId, originalLikes, false);
      options.onUpdate?.();
      options.onError(error?.message || 'いいねの追加に失敗しました');
    }
  );
}
