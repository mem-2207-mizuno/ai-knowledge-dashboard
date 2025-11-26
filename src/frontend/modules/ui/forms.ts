import { DEFAULT_CATEGORY_VALUE } from '../data/constants';
import {
  initMarkdownEditors,
  getMarkdownValue,
  setMarkdownValue,
  refreshMarkdownEditor,
} from './editors';
import { commitPendingTagInput, getTags, setTags } from './tagsInput';
import { collectMetadata, renderMetadataFields } from './metadata';
import { createKnowledge, updateKnowledge, fetchKnowledgeDetail } from '../data/api';
import type { PostCategory } from '../../../types';

export function setupForms() {
  initMarkdownEditors();
}

export function openAddModal() {
  const modal = document.getElementById('addModal');
  if (modal) {
    modal.classList.add('active');
  }
  const form = document.getElementById('addKnowledgeForm') as HTMLFormElement | null;
  form?.reset();
  setMarkdownValue('add', 'addComment', '');
  refreshMarkdownEditor('add');
  const categorySelect = document.getElementById('addCategory') as HTMLSelectElement | null;
  if (categorySelect) {
    categorySelect.value = DEFAULT_CATEGORY_VALUE || categorySelect.value;
    renderMetadataFields('add');
  }
  setTags('add', []);
}

export function closeAddModal() {
  const modal = document.getElementById('addModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

export function closeEditModal() {
  const modal = document.getElementById('editModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

export function submitKnowledge(
  event: Event,
  callbacks?: {
    onSuccess?: (newId?: number) => void;
    onError?: (message: string) => void;
  },
) {
  event.preventDefault();
  const safeCallbacks = {
    onSuccess: callbacks?.onSuccess || (() => {}),
    onError: callbacks?.onError || ((message: string) => console.error(message)),
  };
  commitPendingTagInput('add');
  const tags = getTags('add');
  const metadata = collectMetadata('add');
  const categorySelect = document.getElementById('addCategory') as HTMLSelectElement | null;
  const categoryValue = categorySelect ? categorySelect.value : '';
  const category = (categoryValue || DEFAULT_CATEGORY_VALUE || 'article') as PostCategory;

  const knowledge = {
    title: (document.getElementById('addTitle') as HTMLInputElement).value.trim(),
    url: (document.getElementById('addUrl') as HTMLInputElement).value.trim(),
    comment: getMarkdownValue('add', 'addComment'),
    tags,
    postedBy: (document.getElementById('addPostedBy') as HTMLInputElement).value.trim(),
    thumbnailUrl: (document.getElementById('addThumbnailUrl') as HTMLInputElement).value.trim(),
    category,
    metadata,
  };

  if (!knowledge.title || !knowledge.url || !knowledge.postedBy) {
    safeCallbacks.onError('タイトル、URL、投稿者は必須項目です');
    return;
  }

  const submitButton = (event.target as HTMLFormElement).querySelector(
    'button[type="submit"]',
  ) as HTMLButtonElement;
  const originalText = submitButton.textContent || '';
  submitButton.disabled = true;
  submitButton.textContent = '追加中...';

  createKnowledge(
    knowledge,
    result => {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
      try {
        const response = typeof result === 'string' ? JSON.parse(result) : result;
        if (response.success) {
          safeCallbacks.onSuccess(response.id);
        } else {
          safeCallbacks.onError(response.error || 'ナレッジの追加に失敗しました');
        }
      } catch (error) {
        console.error('Error parsing response:', error);
        safeCallbacks.onError('ナレッジの追加に失敗しました');
      }
    },
    error => {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
      console.error('Error adding knowledge:', error);
      safeCallbacks.onError(error?.message || 'ナレッジの追加に失敗しました');
    },
  );
}

export function openEditModal(
  knowledgeId: number,
  callbacks: {
    onSuccess: () => void;
    onError: (message: string) => void;
  },
) {
  fetchKnowledgeDetail(
    knowledgeId,
    result => {
      let knowledge;
      try {
        knowledge = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (error) {
        console.error('Failed to parse JSON:', error);
        callbacks.onError('データの解析に失敗しました');
        return;
      }

      if (!knowledge) {
        callbacks.onError('ナレッジが見つかりませんでした');
        return;
      }

      (document.getElementById('editKnowledgeId') as HTMLInputElement).value =
        knowledgeId.toString();
      (document.getElementById('editTitle') as HTMLInputElement).value = knowledge.title || '';
      (document.getElementById('editUrl') as HTMLInputElement).value = knowledge.url || '';
      setMarkdownValue('edit', 'editComment', knowledge.comment || '');
      (document.getElementById('editPostedBy') as HTMLInputElement).value =
        knowledge.postedBy || '';
      (document.getElementById('editThumbnailUrl') as HTMLInputElement).value =
        knowledge.thumbnailUrl || '';
      const editCategorySelect = document.getElementById(
        'editCategory',
      ) as HTMLSelectElement | null;
      if (editCategorySelect) {
        editCategorySelect.value =
          knowledge.category || editCategorySelect.value || DEFAULT_CATEGORY_VALUE || '';
        renderMetadataFields('edit', knowledge.metadata || {});
      } else {
        renderMetadataFields('edit', knowledge.metadata || {});
      }
      setTags('edit', knowledge.tags || []);

      const modal = document.getElementById('editModal');
      modal?.classList.add('active');
      refreshMarkdownEditor('edit');
      callbacks.onSuccess();
    },
    error => {
      console.error('Error loading knowledge for edit:', error);
      callbacks.onError(error?.message || 'ナレッジの読み込みに失敗しました');
    },
  );
}

export function submitUpdate(
  event: Event,
  callbacks: {
    onSuccess: () => void;
    onError: (message: string) => void;
  },
) {
  event.preventDefault();

  const knowledgeId = parseInt(
    (document.getElementById('editKnowledgeId') as HTMLInputElement).value,
    10,
  );
  commitPendingTagInput('edit');
  const editTagValues = getTags('edit');
  const editMetadata = collectMetadata('edit');
  const editCategorySelect = document.getElementById('editCategory') as HTMLSelectElement | null;
  const editCategoryValue = editCategorySelect ? editCategorySelect.value : '';
  const category = (editCategoryValue || DEFAULT_CATEGORY_VALUE || 'article') as PostCategory;
  const knowledge = {
    title: (document.getElementById('editTitle') as HTMLInputElement).value.trim(),
    url: (document.getElementById('editUrl') as HTMLInputElement).value.trim(),
    comment: getMarkdownValue('edit', 'editComment'),
    postedBy: (document.getElementById('editPostedBy') as HTMLInputElement).value.trim(),
    thumbnailUrl: (document.getElementById('editThumbnailUrl') as HTMLInputElement).value.trim(),
    tags: editTagValues,
    category,
    metadata: editMetadata,
  };

  if (!knowledge.title || !knowledge.url || !knowledge.postedBy) {
    callbacks.onError('タイトル、URL、投稿者は必須項目です');
    return;
  }

  const submitButton = (event.target as HTMLFormElement).querySelector(
    'button[type="submit"]',
  ) as HTMLButtonElement;
  const originalText = submitButton.textContent || '';
  submitButton.disabled = true;
  submitButton.textContent = '更新中...';

  updateKnowledge(
    knowledgeId,
    knowledge,
    result => {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
      try {
        const response = typeof result === 'string' ? JSON.parse(result) : result;
        if (response.success) {
          callbacks.onSuccess();
        } else {
          callbacks.onError(response.error || 'ナレッジの更新に失敗しました');
        }
      } catch (error) {
        console.error('Error parsing response:', error);
        callbacks.onError('ナレッジの更新に失敗しました');
      }
    },
    error => {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
      console.error('Error updating knowledge:', error);
      callbacks.onError(error?.message || 'ナレッジの更新に失敗しました');
    },
  );
}
