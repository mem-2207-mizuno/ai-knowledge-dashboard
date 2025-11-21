import { getAllKnowledge } from '../data/state';
import { fetchKnowledgeDetail } from '../data/api';
import {
  displayDetail as displayDetailModal,
  closeDetailModal,
  copyShareLink as copyShareLinkUtil,
  submitComment as submitCommentAction,
  addLike as addLikeAction,
  refreshCommentsUI,
} from '../ui/detail';
import { normalizeKnowledgeId } from '../system/utils';
import { loadKnowledge } from '../data/knowledgeList';
import { updateInsights } from '../ui/filters';

type DetailControllerOptions = {
  clientId: string;
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

export function showDetail(id: any, updateHistory = true) {
  const { showError } = requireOptions();
  const normalizedId = normalizeKnowledgeId(id);
  if (normalizedId === null) {
    console.warn('showDetail was called with an invalid ID:', id);
    return;
  }

  if (updateHistory) {
    const url = new URL(window.location.href);
    url.searchParams.set('id', normalizedId.toString());
    if (url.href !== window.location.href) {
      window.history.pushState({ id: normalizedId }, '', url.search);
    }
  }

  const knowledge = getAllKnowledge().find((k) => k.id == normalizedId);
  if (knowledge) {
    displayDetailSafe(knowledge, showError);
    return;
  }

  fetchKnowledgeDetail(
    normalizedId,
    (result) => {
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
      displayDetailSafe(detail, showError);
    },
    (error) => {
      console.error('Failed to fetch detail:', error);
      showError('詳細データの取得に失敗しました。ID: ' + normalizedId);
    }
  );
}

function displayDetailSafe(knowledge: any, showError: (error: any) => void) {
  try {
    displayDetailModal(knowledge);
  } catch (error) {
    showError(error);
  }
}

export function closeModal() {
  closeDetailModal();
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

export function submitComment(knowledgeId: number) {
  const { showError } = requireOptions();
  submitCommentAction(knowledgeId, {
    onSuccess: () => {
      loadKnowledge(knowledgeId, {
        showDetail,
        showError,
      });
    },
    onError: (message) => showError(message),
    onUpdate: () => {
      refreshCommentsUI(knowledgeId);
      updateInsights();
    },
  });
}

export function addLike(knowledgeId: number) {
  const { showError, clientId } = requireOptions();
  addLikeAction(knowledgeId, clientId, {
    onSuccess: () => updateInsights(),
    onError: (message) => showError(message),
    onUpdate: () => {},
  });
}
