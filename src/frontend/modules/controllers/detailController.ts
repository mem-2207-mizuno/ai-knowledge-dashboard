import { getAllKnowledge } from '../data/state';
import { fetchKnowledgeDetail } from '../data/api';
import {
  displayDetail as displayDetailModal,
  closeDetailModal,
  closeDetailPanel as closeDetailPanelUi,
  copyShareLink as copyShareLinkUtil,
  submitComment as submitCommentAction,
  addLike as addLikeAction,
  deleteComment as deleteCommentAction,
  handleCommentKeydown as handleCommentKeydownUi,
  refreshCommentsUI,
} from '../ui/detail';
import { normalizeKnowledgeId } from '../system/utils';
import { loadKnowledge } from '../data/knowledgeList';
import { updateInsights } from '../ui/filters';

type DetailControllerOptions = {
  showError: (error: any) => void;
};

let controllerOptions: DetailControllerOptions | null = null;

export function initDetailController(options: DetailControllerOptions) {
  controllerOptions = options;
}

function requireOptions(): DetailControllerOptions {
  if (!controllerOptions) {
    throw new Error('Detail controller has not been initialized');
  }
  return controllerOptions;
}

type ShowDetailOptions = {
  updateHistory?: boolean;
  mode?: 'modal' | 'panel';
};

function normalizeShowOptions(option?: boolean | ShowDetailOptions): ShowDetailOptions {
  if (typeof option === 'boolean') {
    return { updateHistory: option };
  }
  return option || {};
}

export function showDetail(id: any, options?: boolean | ShowDetailOptions) {
  const { showError } = requireOptions();
  const normalizedId = normalizeKnowledgeId(id);
  if (normalizedId === null) {
    console.warn('showDetail was called with an invalid ID:', id);
    return;
  }

  const parsedOptions = normalizeShowOptions(options);
  const updateHistory = parsedOptions.updateHistory ?? true;
  const viewParam = new URL(window.location.href).searchParams.get('view');
  const mode: 'modal' | 'panel' = parsedOptions.mode || (viewParam === 'panel' ? 'panel' : 'modal');

  if (updateHistory) {
    const url = new URL(window.location.href);
    url.searchParams.set('id', normalizedId.toString());
    if (mode === 'panel') {
      url.searchParams.set('view', 'panel');
    } else {
      url.searchParams.delete('view');
    }
    if (url.href !== window.location.href) {
      window.history.pushState({ id: normalizedId }, '', url.search);
    }
  }

  const knowledge = getAllKnowledge().find(k => k.id == normalizedId);
  if (knowledge) {
    displayDetailSafe(knowledge, showError, mode);
    return;
  }

  fetchKnowledgeDetail(
    normalizedId,
    result => {
      let detail;
      if (typeof result === 'string') {
        try {
          detail = JSON.parse(result);
        } catch (error) {
          console.error('Failed to parse JSON:', error);
          showError('データの解析に失敗しました');
          return;
        }
      } else {
        detail = result;
      }
      displayDetailSafe(detail, showError, mode);
    },
    error => {
      console.error('Failed to fetch detail:', error);
      showError('詳細データの取得に失敗しました。ID: ' + normalizedId);
    },
  );
}

function displayDetailSafe(knowledge: any, showError: (error: any) => void, mode: 'modal' | 'panel') {
  try {
    displayDetailModal(knowledge, mode);
  } catch (error) {
    showError(error);
  }
}

export function closeModal() {
  closeDetailModal();
}

export function closeDetailPanel() {
  closeDetailPanelUi();
}

function currentViewModeFromUrl(): 'modal' | 'panel' {
  const viewParam = new URL(window.location.href).searchParams.get('view');
  return viewParam === 'panel' ? 'panel' : 'modal';
}

export function copyShareLink(id: any) {
  const { showError } = requireOptions();
  const normalizedId = normalizeKnowledgeId(id);
  if (normalizedId === null) {
    showError('共有リンクを作成できませんでした（IDが不正です）');
    return;
  }
  copyShareLinkUtil(normalizedId);
}

export function openDetailPanel(id: any) {
  const { showError } = requireOptions();
  const normalizedId = normalizeKnowledgeId(id);
  if (normalizedId === null) {
    showError('詳細を表示できませんでした（IDが不正です）');
    return;
  }
  showDetail(normalizedId, { mode: 'panel' });
}

export function submitComment(knowledgeId: number) {
  const { showError } = requireOptions();
  submitCommentAction(knowledgeId, {
    onSuccess: () => {
        loadKnowledge(
          knowledgeId,
          {
            showDetail,
            showError,
          },
          { mode: currentViewModeFromUrl() },
        );
    },
    onError: message => showError(message),
    onUpdate: () => {
      refreshCommentsUI(knowledgeId);
      updateInsights();
    },
  });
}

export function addLike(knowledgeId: number) {
  const { showError } = requireOptions();
  addLikeAction(knowledgeId, {
    onSuccess: () => updateInsights(),
    onError: message => showError(message),
    onUpdate: () => {},
  });
}

export function deleteComment(knowledgeId: number, commentId: number) {
  const { showError } = requireOptions();
  deleteCommentAction(knowledgeId, commentId, {
    onSuccess: () => updateInsights(),
    onError: message => showError(message),
  });
}

export const handleCommentKeydown = handleCommentKeydownUi;
