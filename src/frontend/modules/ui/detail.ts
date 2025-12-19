import { renderMarkdown, getCategoryInfo } from './render';
import {
  findKnowledgeById,
  appendOptimisticComment,
  removeOptimisticCommentFromState,
  confirmOptimisticCommentInState,
  isKnowledgeLiked,
  toggleKnowledgeLiked,
  removeCommentById,
  getAllKnowledge,
  setAllKnowledge,
  updateCommentReactionsInState,
  getClientId,
} from '../data/state';
import { postComment, deleteComment as deleteCommentApi, toggleCommentReaction } from '../data/api';
import { renderReadonlyMarkdown } from './editors';
import { CATEGORY_FORM_CONFIGS } from '../data/constants';
import { showNotification } from '../system/notifications';
import { Picker } from 'emoji-mart';
import emojiData from '@emoji-mart/data';

const LIKES_BUTTON_PREFIX = 'like-btn-';
const MODAL_LIKE_BUTTON_PREFIX = 'modal-like-btn-';
const PANEL_LIKE_BUTTON_PREFIX = 'panel-like-btn-';
type DetailMode = 'modal' | 'panel';
let currentDetailMode: DetailMode = 'modal';
const QUICK_REACTIONS = ['👍', '😂', '🎉', '❤️', '🙏', '👀', '😮', '😢', '🔥'];
let emojiPickerContainer: HTMLElement | null = null;
let emojiPickerElement: HTMLElement | null = null;
let emojiMartPicker: any | null = null;
let outsideClickHandlerRegistered = false;
let activeReactionTarget: { knowledgeId: number; commentId: number } | null = null;

function unifiedToNative(unified?: string): string {
  if (!unified) return '';
  try {
    return unified
      .split('-')
      .map(code => String.fromCodePoint(parseInt(code, 16)))
      .join('');
  } catch (error) {
    console.warn('Failed to convert unified emoji', unified, error);
    return '';
  }
}

function normalizeReactions(reactions: any[]): any[] {
  const clientId = getClientId();
  return Array.isArray(reactions)
    ? reactions.map(reaction => ({
        ...reaction,
        reactedByMe: Array.isArray(reaction.reactors)
          ? reaction.reactors.includes(clientId)
          : reaction.reactedByMe === true,
      }))
    : [];
}

function registerOutsideClickHandler() {
  if (outsideClickHandlerRegistered) {
    return;
  }
  outsideClickHandlerRegistered = true;

  document.addEventListener('click', event => {
    if (!emojiPickerContainer || emojiPickerContainer.style.display === 'none') {
      return;
    }
    const targetEl = event.target as HTMLElement | null;
    const isTrigger =
      targetEl?.classList?.contains('reaction-picker-trigger') ||
      Boolean(targetEl?.closest('.reaction-picker-trigger'));

    if (emojiPickerContainer.contains(event.target as Node) || isTrigger) {
      return;
    }
    hideEmojiPicker();
  });
}

function getNativeEmoji(payload: any): string {
  if (!payload) return '';
  return (
    payload.native ||
    payload.unicode ||
    payload.emoji?.native ||
    payload.emoji?.unicode ||
    payload.skins?.[0]?.native ||
    unifiedToNative(payload.unified || payload.emoji?.unified || payload.emoji?.hexcode) ||
    ''
  );
}

function ensureEmojiPicker() {
  if (emojiPickerContainer && emojiPickerElement) {
    return;
  }
  emojiPickerContainer = document.createElement('div');
  emojiPickerContainer.id = 'commentEmojiPickerContainer';
  emojiPickerContainer.style.position = 'absolute';
  emojiPickerContainer.style.zIndex = '1200';
  emojiPickerContainer.style.display = 'none';
  emojiPickerContainer.style.boxShadow = '0 12px 30px rgba(0,0,0,0.18)';

  const handleSelect = (payload: any) => {
    const emoji = getNativeEmoji(payload);
    if (!emoji || !activeReactionTarget) {
      return;
    }
    toggleCommentReactionUI(
      activeReactionTarget.knowledgeId,
      activeReactionTarget.commentId,
      emoji,
      true,
    );
    hideEmojiPicker();
  };

  try {
    emojiMartPicker = new (Picker as any)({
      data: emojiData as any,
      theme: 'light',
      previewPosition: 'none',
      onEmojiSelect: handleSelect,
    });
    emojiPickerElement = emojiMartPicker as any;
    if (emojiPickerElement) {
      (emojiPickerElement as any).id = 'commentEmojiPicker';
      emojiPickerContainer.appendChild(emojiPickerElement);
    }
  } catch (error) {
    console.error('Failed to create emoji-mart Picker', error);
  }

  document.body.appendChild(emojiPickerContainer);
  registerOutsideClickHandler();
}

function showEmojiPicker(trigger: HTMLElement, knowledgeId: number, commentId: number) {
  ensureEmojiPicker();
  activeReactionTarget = { knowledgeId, commentId };
  if (!emojiPickerContainer) {
    return;
  }
  const rect = trigger.getBoundingClientRect();
  emojiPickerContainer.style.left = `${rect.left + window.scrollX}px`;
  emojiPickerContainer.style.top = `${rect.bottom + window.scrollY + 8}px`;
  emojiPickerContainer.style.display = 'block';
}

function hideEmojiPicker() {
  if (emojiPickerContainer) {
    emojiPickerContainer.style.display = 'none';
  }
  activeReactionTarget = null;
}

function normalizeKnowledgeReactions(knowledge: any): any {
  if (!knowledge || !Array.isArray(knowledge.comments)) {
    return knowledge;
  }
  knowledge.comments = knowledge.comments.map((comment: any) => ({
    ...comment,
    reactions: normalizeReactions(comment.reactions || []),
  }));
  return knowledge;
}

function clearModalContent() {
  const modalBody = document.getElementById('modalBody');
  const modalTitle = document.getElementById('modalTitle');
  const modalActions = document.getElementById('modalActions');
  if (modalBody) {
    modalBody.innerHTML = '';
  }
  if (modalTitle) {
    modalTitle.textContent = '';
  }
  if (modalActions) {
    modalActions.innerHTML = '';
  }
}

function resetPanel() {
  const panel = document.getElementById('detailPanel');
  const panelContent = document.getElementById('detailPanelContent');
  const placeholder = document.getElementById('detailPanelPlaceholder');
  const mainContent = document.querySelector('.main-content');
  if (panelContent) {
    panelContent.innerHTML = '';
  }
  if (placeholder) {
    placeholder.style.display = 'block';
  }
  panel?.classList.remove('active');
  mainContent?.classList.remove('panel-active');
}

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

function renderComments(comments: any[] = [], knowledgeId: number): string {
  if (!comments || comments.length === 0) {
    return '<p class="comment-empty">コメントはまだありません</p>';
  }
  return comments
    .map(comment => {
      const date = comment.postedAt
        ? typeof comment.postedAt === 'string'
          ? new Date(comment.postedAt)
          : new Date(comment.postedAt)
        : new Date();
      const canDelete = !!comment.id;
      const reactions = Array.isArray(comment.reactions) ? comment.reactions : [];
      const reactionChips = reactions
        .sort((a: any, b: any) => b.count - a.count)
        .map(
          (reaction: any) => `
          <button
            class="reaction-chip ${reaction.reactedByMe ? 'active' : ''}"
            onclick="toggleCommentReactionUI(${knowledgeId}, ${comment.id}, '${reaction.emoji}')"
            title="${reaction.emoji} を取り消す/追加する"
          >
            <span class="reaction-emoji">${reaction.emoji}</span>
            <span class="reaction-count">${reaction.count}</span>
          </button>
        `,
        )
        .join('');
      const quickBar = QUICK_REACTIONS.map(
        emoji => `
          <button
            class="reaction-quick-btn"
            onclick="toggleCommentReactionUI(${knowledgeId}, ${comment.id}, '${emoji}')"
            title="${emoji} を付ける"
          >${emoji}</button>
        `,
      ).join('');
      const pickerIcon = `
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="none" d="M0 0h24v24H0z"></path>
          <path d="M7 9.5C7 8.67 7.67 8 8.5 8s1.5.67 1.5 1.5S9.33 11 8.5 11 7 10.33 7 9.5m5 8c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5m3.5-6.5c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5M22 1h-2v2h-2v2h2v2h2V5h2V3h-2zm-2 11c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8c1.46 0 2.82.4 4 1.08V2.84A9.9 9.9 0 0 0 11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12c0-1.05-.17-2.05-.47-3H19.4c.38.93.6 1.94.6 3"></path>
        </svg>
      `;
      return `
        <div class="comment-card" ${comment.pending ? 'data-pending="true"' : ''}>
          <div class="comment-card-header">
            <div>
              <div class="comment-author">${comment.author || '匿名'}</div>
              <div class="comment-date">${date.toLocaleString('ja-JP')}</div>
            </div>
            ${
              canDelete
                ? `<button class="icon-button comment-delete" onclick="deleteComment(${knowledgeId}, ${
                    comment.id
                  })" title="削除"><span class="material-icons">delete</span></button>`
                : ''
            }
          </div>
          <div class="comment-card-body">${renderMarkdown(comment.text || '')}</div>
          <div class="comment-reaction-row">
            <div class="reaction-chip-list">
              ${reactionChips || '<span class="reaction-empty">リアクションはまだありません</span>'}
            </div>
            <div class="reaction-actions">
              <div class="reaction-quick-box">
                <div class="reaction-quick-bar">
                  ${quickBar}
                </div>
                <button
                  class="reaction-picker-trigger"
                  onclick="openCommentReactionPicker(${knowledgeId}, ${comment.id}, event)"
                  title="その他の絵文字を追加"
                >${pickerIcon}</button>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
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
  commentsList.innerHTML = renderComments(comments, knowledgeId);
}

function applyReactionResult(
  knowledgeId: number,
  commentId: number,
  reactions: any[],
  message?: string,
) {
  updateCommentReactionsInState(knowledgeId, commentId, normalizeReactions(reactions));
  refreshCommentsUI(knowledgeId);
  if (message) {
    showNotification(message, { type: 'success' });
  }
}

export function toggleCommentReactionUI(
  knowledgeId: number,
  commentId: number,
  emoji: string,
  skipNotification?: boolean,
) {
  if (!commentId || !emoji) {
    return;
  }
  const clientId = getClientId();
  toggleCommentReaction(
    commentId,
    emoji,
    clientId,
    result => {
      let parsed = result as any;
      if (typeof result === 'string') {
        try {
          parsed = JSON.parse(result);
        } catch (error) {
          console.error('Failed to parse reaction response', error);
        }
      }
      if (parsed?.success) {
        applyReactionResult(
          knowledgeId,
          commentId,
          parsed.reactions || [],
          skipNotification ? undefined : 'リアクションを更新しました',
        );
      } else {
        showNotification(parsed?.error || 'リアクションの更新に失敗しました', { type: 'error' });
      }
    },
    error => {
      console.error('Failed to toggle reaction', error);
      showNotification('リアクションの更新に失敗しました', { type: 'error' });
    },
  );
}

export function openCommentReactionPicker(knowledgeId: number, commentId: number, event: Event) {
  const trigger = event?.currentTarget as HTMLElement | null;
  if (!trigger) {
    return;
  }
  event.stopPropagation();
  showEmojiPicker(trigger, knowledgeId, commentId);
}

export function updateLikeDisplay(knowledgeId: number, likes: number, pending = false) {
  const liked = isKnowledgeLiked(knowledgeId);
  const cardBtn = document.getElementById(`${LIKES_BUTTON_PREFIX}${knowledgeId}`);
  if (cardBtn) {
    cardBtn.innerHTML = `<span class="material-icons">${liked ? 'star' : 'star_border'}</span>`;
    cardBtn.classList.toggle('active', liked);
    (cardBtn as HTMLButtonElement).disabled = pending;
    (cardBtn as HTMLButtonElement).style.opacity = pending ? '0.6' : '1';
  }

  const modalBtn = document.getElementById(`${MODAL_LIKE_BUTTON_PREFIX}${knowledgeId}`);
  if (modalBtn) {
    modalBtn.innerHTML = `<span class="material-icons">${liked ? 'star' : 'star_border'}</span>`;
    modalBtn.classList.toggle('active', liked);
    (modalBtn as HTMLButtonElement).disabled = pending;
    (modalBtn as HTMLButtonElement).style.opacity = pending ? '0.6' : '1';
  }

  const panelBtn = document.getElementById(`${PANEL_LIKE_BUTTON_PREFIX}${knowledgeId}`);
  if (panelBtn) {
    panelBtn.innerHTML = `<span class="material-icons">${liked ? 'star' : 'star_border'}</span>`;
    panelBtn.classList.toggle('active', liked);
    (panelBtn as HTMLButtonElement).disabled = pending;
    (panelBtn as HTMLButtonElement).style.opacity = pending ? '0.6' : '1';
  }
}

function renderDetailBodyHtml(knowledge: any, mode: DetailMode): string {
  knowledge = normalizeKnowledgeReactions(knowledge);
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
  const commentsHtml = renderComments(commentsArray, knowledge.id);

  const closeHandler = mode === 'panel' ? 'closeDetailPanel()' : 'closeModal()';

  return `
        <div style="display:flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px;">
          <span class="category-badge">${categoryLabel}</span>
          <span class="status-pill">${statusLabel}</span>
        </div>
        ${
          knowledge.thumbnailUrl
            ? `<div class="detail-thumbnail" aria-label="サムネイル">
                <img src="${knowledge.thumbnailUrl}" alt="${knowledge.title}" loading="lazy" />
              </div>`
            : ''
        }
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
        <div class="comment-section">
          <div class="comment-section-header">
            <h3>コメント</h3>
          </div>
          <div id="commentsList" class="comment-list">${commentsHtml}</div>
          <div class="comment-form">
            <label class="comment-field">
              <span class="comment-label">本文</span>
              <textarea id="newComment" placeholder="コメントを入力（改行可）" rows="4" onkeydown="handleCommentKeydown(event, ${knowledge.id})"></textarea>
            </label>
            <div class="comment-form-footer">
              <label class="comment-field small">
                <span class="comment-label">お名前</span>
                <input type="text" id="commentAuthor" placeholder="匿名" />
              </label>
              <div class="comment-form-actions">
                <button class="secondary-button" onclick="${closeHandler}">閉じる</button>
                <button class="primary-button" onclick="submitComment(${knowledge.id})">投稿</button>
              </div>
            </div>
            <div class="comment-hint">Enterで改行 / Cmd+Enterで投稿</div>
          </div>
        </div>
      `;
}

function renderActionButtons(knowledge: any, mode: DetailMode) {
  const isLiked = knowledge.id ? isKnowledgeLiked(knowledge.id) : false;
  const likePrefix = mode === 'panel' ? PANEL_LIKE_BUTTON_PREFIX : MODAL_LIKE_BUTTON_PREFIX;
  const likeClass = `icon-button ${isLiked ? 'active' : ''}`;
  const isArchived = (knowledge.status || 'open').toLowerCase() === 'archived';
  const archiveAction = isArchived ? 'open' : 'archived';
  const archiveTitle = isArchived ? 'アーカイブを解除' : 'アーカイブ';
  const archiveIcon = isArchived ? 'unarchive' : 'inventory_2';
  const expandButton =
    mode === 'modal'
      ? `<button class="icon-button" onclick="openDetailPanel(${knowledge.id})" title="全体表示">
          <span class="material-icons">open_in_full</span>
        </button>`
      : `<button class="icon-button" onclick="showDetail(${knowledge.id}, { mode: 'modal' })" title="モーダルで開く">
          <span class="material-icons">open_in_new</span>
        </button>`;

  return `
    <div class="icon-button-group">
      <button id="${likePrefix}${knowledge.id}" class="${likeClass}" onclick="addLike(${knowledge.id})" title="お気に入り">
        <span class="material-icons">${isLiked ? 'star' : 'star_border'}</span>
      </button>
      <button class="icon-button" onclick="copyShareLink(${knowledge.id}, '${mode}')" title="リンクをコピー">
        <span class="material-icons">link</span>
      </button>
      <button class="icon-button" onclick="openEditModal(${knowledge.id})" title="編集">
        <span class="material-icons">edit</span>
      </button>
      <button id="archive-btn-${knowledge.id}" class="icon-button" onclick="archiveKnowledge(${knowledge.id}, '${archiveAction}')" title="${archiveTitle}">
        <span class="material-icons">${archiveIcon}</span>
      </button>
      ${expandButton}
    </div>
  `;
}

export function displayDetail(knowledge: any, mode: DetailMode = 'modal') {
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

  currentDetailMode = mode;
  const bodyHtml = renderDetailBodyHtml(knowledge, mode);
  const actionsHtml = renderActionButtons(knowledge, mode);

  if (mode === 'modal') {
    resetPanel();
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
    modalBody.innerHTML = bodyHtml;
    modal.classList.add('active');
    modalActions.innerHTML = actionsHtml;
  } else {
    clearModalContent();
    const modal = document.getElementById('detailModal');
    const panel = document.getElementById('detailPanel');
    const panelContent = document.getElementById('detailPanelContent');
    const placeholder = document.getElementById('detailPanelPlaceholder');
    const mainContent = document.querySelector('.main-content');
    if (!panel || !panelContent || !placeholder || !mainContent) {
      throw new Error('詳細パネルを描画できませんでした');
    }
    modal?.classList.remove('active');
    placeholder.style.display = 'none';
    panelContent.innerHTML = `
      <div class="detail-panel-header">
        <div class="detail-panel-title-group">
          <h2>${knowledge.title || 'ナレッジ詳細'}</h2>
        </div>
        <div class="detail-panel-actions">
          <button class="icon-button" onclick="closeDetailPanel()" title="閉じる">
            <span class="material-icons">close</span>
          </button>
          ${actionsHtml}
        </div>
      </div>
      <div class="detail-panel-content">${bodyHtml}</div>
    `;
    panel.classList.add('active');
    mainContent.classList.add('panel-active');
  }

  updateLikeDisplay(knowledge.id, knowledge.likes, knowledge.likePending);
  renderReadonlyMarkdown('knowledgeDetailBody', knowledge.comment || '（説明なし）');
}

export function isDetailPanelActive(): boolean {
  const panel = document.getElementById('detailPanel');
  return Boolean(panel && panel.classList.contains('active'));
}

export function closeDetailPanelIfOpen(): boolean {
  if (!isDetailPanelActive()) {
    return false;
  }
  closeDetailPanel();
  return true;
}

export function closeDetailModal() {
  const url = new URL(window.location.href);
  if (url.searchParams.has('id')) {
    url.searchParams.delete('id');
    url.searchParams.delete('view');
    window.history.pushState({ id: null }, '', url.pathname + url.search);
  }
  const modal = document.getElementById('detailModal');
  modal?.classList.remove('active');
  clearModalContent();
  currentDetailMode = 'modal';
}

export function closeDetailPanel() {
  const url = new URL(window.location.href);
  if (url.searchParams.has('id')) {
    url.searchParams.delete('id');
    url.searchParams.delete('view');
    window.history.pushState({ id: null }, '', url.pathname + url.search);
  }
  resetPanel();
  currentDetailMode = 'panel';
}

function fallbackCopyText(text: string): boolean {
  try {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'absolute';
    helper.style.left = '-9999px';
    document.body.appendChild(helper);
    helper.select();
    const success = document.execCommand('copy');
    document.body.removeChild(helper);
    return success;
  } catch (error) {
    console.error('Fallback clipboard copy failed:', error);
    return false;
  }
}

export function copyShareLink(id: number, mode?: DetailMode) {
  // /dev を /exec に正規化する関数
  const normalizeExecUrl = (url: string): string => {
    return String(url || '').replace(/\/dev(?=$|\/|\?)/, '/exec');
  };

  // GASの正規URLかどうかをチェック
  const isCanonicalGasUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'script.google.com' && parsed.pathname.includes('/macros/s/');
    } catch {
      return false;
    }
  };

  // googleusercontent.comのURLかどうかをチェック
  const isGoogleusercontentUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.endsWith('googleusercontent.com');
    } catch {
      return false;
    }
  };

  // 複数の候補から最適なベースURLを選択
  const locationBase =
    window.location.origin && window.location.pathname
      ? normalizeExecUrl(`${window.location.origin}${window.location.pathname}`)
      : '';
  const serverBase = normalizeExecUrl((window as any).SERVER_DATA?.appUrl || '');
  const fallbackBase = normalizeExecUrl(window.location.href.split('?')[0]);

  // 優先順位に基づいてベースURLを選択
  const baseUrl =
    (locationBase && isCanonicalGasUrl(locationBase) && locationBase) ||
    (serverBase && isCanonicalGasUrl(serverBase) && serverBase) ||
    (locationBase && !isGoogleusercontentUrl(locationBase) && locationBase) ||
    serverBase ||
    fallbackBase;

  const shareMode = mode || currentDetailMode || 'modal';
  const urlObj = new URL(baseUrl);
  urlObj.searchParams.set('id', String(id));
  if (shareMode === 'panel') {
    urlObj.searchParams.set('view', 'panel');
  } else {
    urlObj.searchParams.delete('view');
  }
  const shareUrl = urlObj.toString();
  const onSuccess = () => showNotification('共有用URLをコピーしました', { type: 'success' });
  const onFailure = (err: any) => {
    console.error('Failed to copy share URL. URL:', shareUrl, err);
    showNotification('コピーに失敗しました。URLを直接コピーしてください。', {
      type: 'error',
      duration: 5000,
    });
  };

  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(shareUrl)
      .then(onSuccess)
      .catch(err => {
        console.warn('Clipboard API copy failed, trying fallback:', err);
        const success = fallbackCopyText(shareUrl);
        if (success) {
          onSuccess();
          return;
        }
        onFailure(err);
      });
    return;
  }

  const fallbackSucceeded = fallbackCopyText(shareUrl);
  if (fallbackSucceeded) {
    onSuccess();
  } else {
    onFailure(new Error('Clipboard API is not available'));
  }
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

export function deleteComment(
  knowledgeId: number,
  commentId: number,
  options: {
    onSuccess?: () => void;
    onError?: (message: string) => void;
  } = {},
) {
  const onSuccess = options.onSuccess || (() => {});
  const onError = options.onError || (() => {});
  deleteCommentApi(
    commentId,
    knowledgeId,
    success => {
      if (success) {
        removeCommentById(knowledgeId, commentId);
        refreshCommentsUI(knowledgeId);
        onSuccess();
      } else {
        onError('コメントの削除に失敗しました');
      }
    },
    error => {
      console.error(error);
      onError(error?.message || 'コメントの削除に失敗しました');
    },
  );
}

export function handleCommentKeydown(event: KeyboardEvent, knowledgeId: number) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    const globalScope = window as any;
    if (typeof globalScope.submitComment === 'function') {
      globalScope.submitComment(knowledgeId);
    }
  }
}

export function addLike(
  knowledgeId: number,
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
  toggleKnowledgeLiked(knowledgeId);
  knowledge.likePending = false;
  updateLikeDisplay(knowledgeId, knowledge.likes || 0, false);
  options.onUpdate?.();
  options.onSuccess();
}
