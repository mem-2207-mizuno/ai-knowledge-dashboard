import { fetchKnowledgeList } from './api';
import { normalizeKnowledgeId } from '../system/utils';
import { setAllKnowledge, getAllKnowledge, getSelectedTags } from './state';
import {
  updateCategoryUI,
  updateViewUI,
  updateInsights,
  updateTagFilter,
  filterKnowledge,
} from '../ui/filters';
import { renderKnowledgeGrid } from '../ui/render';
import type { Comment } from '../../../types';

type LoadCallbacks = {
  showDetail: (id: number, updateHistory?: boolean) => void;
  showError: (error: any) => void;
};

export function displayKnowledge(knowledgeList: any[]) {
  const grid = document.getElementById('knowledgeGrid');
  if (!grid) {
    return;
  }

  if (!knowledgeList) {
    grid.innerHTML = '<div class="error">データの取得に失敗しました</div>';
    console.error('knowledgeList is null or undefined');
    return;
  }

  if (!Array.isArray(knowledgeList)) {
    grid.innerHTML = '<div class="error">データ形式が正しくありません</div>';
    console.error('knowledgeList is not an array:', knowledgeList);
    return;
  }

  const normalizedList = knowledgeList.map(k => ({
    ...k,
    category: k.category || 'article',
    status: k.status || 'open',
    likePending: false,
    postedAt: k.postedAt ? new Date(k.postedAt) : new Date(),
    comments: Array.isArray(k.comments)
      ? k.comments.map((comment: Comment) => ({
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

  updateTagFilter(currentKnowledge, getSelectedTags());
  updateInsights();
  updateCategoryUI();
  updateViewUI();
  filterKnowledge();
}

export function loadKnowledge(openId: number | null, callbacks: LoadCallbacks) {
  console.log('Loading knowledge list...');
  fetchKnowledgeList(
    result => {
      let knowledgeList;
      if (typeof result === 'string') {
        try {
          knowledgeList = JSON.parse(result);
        } catch (error) {
          console.error('Failed to parse JSON:', error);
          callbacks.showError('データの解析に失敗しました');
          return;
        }
      } else if (Array.isArray(result)) {
        knowledgeList = result;
      } else if (result === null || result === undefined) {
        console.error('Result is null or undefined');
        callbacks.showError('データの取得に失敗しました（nullが返されました）');
        return;
      } else {
        console.error('Unexpected result type:', typeof result, result);
        callbacks.showError('予期しないデータ形式です');
        return;
      }

      displayKnowledge(knowledgeList);

      const normalizedOpenId = normalizeKnowledgeId(openId);
      if (normalizedOpenId !== null) {
        callbacks.showDetail(normalizedOpenId, false);
      }
    },
    error => {
      console.error('Failure handler called with error:', error);
      callbacks.showError(error);
    },
  );
}
