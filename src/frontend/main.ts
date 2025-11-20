import { setupFormControls } from './modules/metadata';
import { renderKnowledgeGrid } from './modules/render';
import {
  initClientState,
  getClientId,
  getAllKnowledge,
  setAllKnowledge,
  getSelectedTags,
  setSelectedTags,
  getSelectedCategory,
  setSelectedCategory,
  getCurrentView,
  setCurrentView,
  getLikedKnowledgeIds,
  isKnowledgeLiked,
} from './modules/state';
import {
  setupForms,
  openAddModal as openAddModalForm,
  closeAddModal as closeAddModalForm,
  submitKnowledge as submitKnowledgeForm,
  openEditModal as openEditModalForm,
  closeEditModal as closeEditModalForm,
  submitUpdate as submitUpdateForm,
} from './modules/forms';
import {
  displayDetail as displayDetailModal,
  closeDetailModal,
  copyShareLink as copyShareLinkUtil,
  submitComment as submitCommentAction,
  addLike as addLikeAction,
  refreshCommentsUI,
} from './modules/detail';
import {
  updateCategoryUI,
  setCategory as setCategoryFilter,
  updateViewUI,
  setView as setViewFilter,
  updateInsights,
  updateTagFilter,
  filterKnowledge as filterKnowledgeCore,
  searchKnowledge as searchKnowledgeCore,
  toggleTag as toggleTagCore,
} from './modules/filters';
import { fetchKnowledgeList, fetchKnowledgeDetail } from './modules/api';
import { normalizeKnowledgeId } from './modules/utils';
import { setupTagInputs, setTags } from './modules/tagsInput';

declare const SERVER_DATA: any;
declare const google: any;
initClientState();
const CLIENT_ID = getClientId();

const setCategory = (category: string) => setCategoryFilter(category);
const setView = (view: 'all' | 'favorites') => setViewFilter(view);
const filterKnowledge = () => filterKnowledgeCore();
const searchKnowledge = () => searchKnowledgeCore();
const toggleTag = (tag: string) => toggleTagCore(tag);

// ページ読み込み時にナレッジ一覧を取得
window.onload = function () {
  setupForms();
  setupFormControls();
  setupTagInputs();
  setTags('add', []);
  setTags('edit', []);
  updateCategoryUI();
  updateViewUI();
  updateInsights();
  // 初期ロード時のIDチェック
  // サーバーから渡されたIDのみを信頼し、クライアント側でのURL解析は行わない
  // (GASのiframe URLには予期せぬパラメータが含まれる可能性があるため)
  let initialId = normalizeKnowledgeId(SERVER_DATA.initialId);
  if (initialId === null) {
    console.log('No valid initialId provided by server.');
  } else {
    console.log('Parsed initialId from server:', initialId);
  }

  // サーバーサイドから渡された初期データがある場合はそれを使用
  const initialData = SERVER_DATA.initialData;
  if (initialData) {
    try {
      console.log('Loaded initial data from server');
      displayKnowledge(initialData);

      // 初期IDがある場合は詳細を表示
      if (initialId !== null) {
        console.log('Attempting to show initial detail for ID:', initialId);
        // 少し遅延させてデータ描画を確実にする
        setTimeout(() => {
          showDetail(initialId, false);
        }, 100);
      }
    } catch (e) {
      console.error('Failed to process initial data:', e);
      loadKnowledge(initialId); // 失敗時は通常通り取得
    }
  } else {
    loadKnowledge(initialId);
  }

  // ... (popstateイベントはそのまま)
};

// ナレッジ一覧を読み込む
function loadKnowledge(openId = null) {
  console.log('Loading knowledge list...');
  fetchKnowledgeList(
    (result) => {
      let knowledgeList;
      if (typeof result === 'string') {
        try {
          knowledgeList = JSON.parse(result);
        } catch (e) {
          console.error('Failed to parse JSON:', e);
          showError('データの解析に失敗しました');
          return;
        }
      } else if (Array.isArray(result)) {
        knowledgeList = result;
      } else if (result === null || result === undefined) {
        console.error('Result is null or undefined');
        showError('データの取得に失敗しました（nullが返されました）');
        return;
      } else {
        console.error('Unexpected result type:', typeof result, result);
        showError('予期しないデータ形式です');
        return;
      }

      displayKnowledge(knowledgeList);

      const normalizedOpenId = normalizeKnowledgeId(openId);
      if (normalizedOpenId !== null) {
        showDetail(normalizedOpenId, false);
      }
    },
    (error) => {
      console.error('Failure handler called with error:', error);
      showError(error);
    }
  );
}

// ナレッジを表示する
function displayKnowledge(knowledgeList) {
  const grid = document.getElementById('knowledgeGrid');

  // nullチェック
  if (!knowledgeList) {
    grid.innerHTML = '<div class="error">データの取得に失敗しました</div>';
    console.error('knowledgeList is null or undefined');
    return;
  }

  // 配列でない場合の処理
  if (!Array.isArray(knowledgeList)) {
    grid.innerHTML = '<div class="error">データ形式が正しくありません</div>';
    console.error('knowledgeList is not an array:', knowledgeList);
    return;
  }

  const normalizedList = knowledgeList.map((k) => ({
    ...k,
    category: k.category || 'article',
    status: k.status || 'open',
    likePending: false,
    postedAt: k.postedAt ? new Date(k.postedAt) : new Date(),
    comments: Array.isArray(k.comments)
      ? k.comments.map((comment) => ({
          ...comment,
          postedAt: comment.postedAt ? new Date(comment.postedAt) : new Date(),
        }))
      : [],
  }));
  setAllKnowledge(normalizedList);

  const currentKnowledge = getAllKnowledge();

  if (currentKnowledge.length === 0) {
    updateTagFilter([], getSelectedTags());
    updateInsights();
    renderKnowledgeGrid([]);
    updateCategoryUI();
    updateViewUI();
    return;
  }

  // タグフィルタを更新
  updateTagFilter(currentKnowledge, getSelectedTags());
  updateInsights();
  updateCategoryUI();
  updateViewUI();
  filterKnowledge();
}
// 詳細を表示
function showDetail(id, updateHistory = true) {
  const normalizedId = normalizeKnowledgeId(id);
  if (normalizedId === null) {
    console.warn('showDetail was called with an invalid ID:', id);
    return;
  }

  // URL更新
  if (updateHistory) {
    // GASのexec URLパラメータ形式に合わせる
    // 現在のURLにパラメータを追加/置換
    const url = new URL(window.location.href);
    url.searchParams.set('id', normalizedId.toString());
    // pushStateで履歴に追加
    if (url.href !== window.location.href) {
      window.history.pushState({ id: normalizedId }, '', url.search);
    }
  }

  // まずローカルのデータ（一覧取得済みのデータ）から探す
  // 型変換して比較 (==) を使用して柔軟にマッチさせる
  console.log('Searching knowledge with id:', normalizedId);
  const knowledge = getAllKnowledge().find((k) => k.id == normalizedId);

  if (knowledge) {
    console.log('Displaying detail from local data:', knowledge.title);
    displayDetail(knowledge);
  } else {
    console.log('Knowledge not found in local data, fetching from server...');
    fetchKnowledgeDetail(
      normalizedId,
      (result) => {
        let detail;
        if (typeof result === 'string') {
          try {
            detail = JSON.parse(result);
          } catch (e) {
            console.error('Failed to parse JSON:', e);
            showError('データの解析に失敗しました');
            return;
          }
        } else {
          detail = result;
        }
        displayDetail(detail);
      },
      (error) => {
        console.error('Failed to fetch detail:', error);
        showError('詳細データの取得に失敗しました。ID: ' + normalizedId);
      }
    );
  }
}

// 詳細を表示（モーダル）
function displayDetail(knowledge) {
  try {
    displayDetailModal(knowledge);
  } catch (error) {
    showError(error);
  }
}

// モーダルを閉じる
function closeModal() {
  closeDetailModal();
}

// 共有リンクをコピー
function copyShareLink(id) {
  const normalizedId = normalizeKnowledgeId(id);
  if (normalizedId === null) {
    showError('共有リンクを作成できませんでした（IDが不正です）');
    return;
  }
  copyShareLinkUtil(normalizedId);
}

// コメントを投稿
function submitComment(knowledgeId) {
  submitCommentAction(knowledgeId, {
    onSuccess: () => {
      loadKnowledge(knowledgeId);
    },
    onError: (message) => showError(message),
    onUpdate: () => {
      refreshCommentsUI(knowledgeId);
      updateInsights();
    },
  });
}

// いいねを追加
function addLike(knowledgeId) {
  addLikeAction(knowledgeId, CLIENT_ID, {
    onSuccess: () => updateInsights(),
    onError: (message) => showError(message),
    onUpdate: () => {},
  });
}

// モーダルの外側をクリックで閉じる
window.onclick = function (event) {
  const detailModal = document.getElementById('detailModal');
  const addModal = document.getElementById('addModal');
  const editModal = document.getElementById('editModal');
  if (event.target === detailModal) {
    closeModal();
  }
  if (event.target === addModal) {
    closeAddModal();
  }
  if (event.target === editModal) {
    closeEditModal();
  }
};

function openAddModal() {
  openAddModalForm();
}

function closeAddModal() {
  closeAddModalForm();
}

function submitKnowledge(event) {
  submitKnowledgeForm(event, {
    onSuccess: () => {
      closeAddModalForm();
      loadKnowledge();
      alert('ナレッジを追加しました！');
    },
    onError: (message) => showError(message),
  });
}

function openEditModal(knowledgeId) {
  openEditModalForm(knowledgeId, {
    onSuccess: () => {},
    onError: (message) => showError(message),
  });
}

function closeEditModal() {
  closeEditModalForm();
}

function submitUpdate(event) {
  submitUpdateForm(event, {
    onSuccess: () => {
      closeEditModalForm();
      closeModal();
      loadKnowledge();
      alert('ナレッジを更新しました！');
    },
    onError: (message) => showError(message),
  });
}

function showError(error) {
  console.error('showError called with:', error);
  const errorMessage =
    typeof error === 'string'
      ? error
      : error?.message || error?.toString() || '不明なエラー';
  alert(`エラーが発生しました: ${errorMessage}`);
  const grid = document.getElementById('knowledgeGrid');
  if (grid && grid.innerHTML.includes('class="loading"')) {
    grid.innerHTML = `<div class="error">データの読み込みに失敗しました: ${errorMessage}</div>`;
  }
}

const globalScope = window as any;
Object.assign(globalScope, {
  openAddModal,
  closeAddModal,
  submitKnowledge,
  closeModal,
  searchKnowledge,
  setView,
  setCategory,
  toggleTag,
  showDetail,
  addLike,
  submitComment,
  copyShareLink,
  openEditModal,
  closeEditModal,
  submitUpdate,
});
