import { setupForms } from '../ui/forms';
import { setupFormControls } from '../ui/metadata';
import { setupTagInputs, setTags } from '../ui/tagsInput';
import {
  updateCategoryUI,
  updateViewUI,
  updateInsights,
} from '../ui/filters';
import { normalizeKnowledgeId } from './utils';
import { displayKnowledge, loadKnowledge } from '../data/knowledgeList';

interface BootstrapOptions {
  initialData: any;
  initialId: any;
  showDetail: (id: number, updateHistory?: boolean) => void;
  showError: (error: any) => void;
  closeDetail: () => void;
  closeAdd: () => void;
  closeEdit: () => void;
}

export function bootstrapApp(options: BootstrapOptions) {
  setupForms();
  setupFormControls();
  setupTagInputs();
  setTags('add', []);
  setTags('edit', []);
  updateCategoryUI();
  updateViewUI();
  updateInsights();

  window.onclick = function (event) {
    const detailModal = document.getElementById('detailModal');
    const addModal = document.getElementById('addModal');
    const editModal = document.getElementById('editModal');
    if (event.target === detailModal) {
      options.closeDetail();
    }
    if (event.target === addModal) {
      options.closeAdd();
    }
    if (event.target === editModal) {
      options.closeEdit();
    }
  };

  const normalizedInitialId = normalizeKnowledgeId(options.initialId);
  const initialData = options.initialData;

  if (initialData) {
    try {
      displayKnowledge(initialData);
      if (normalizedInitialId !== null) {
        setTimeout(() => options.showDetail(normalizedInitialId, false), 100);
      }
    } catch (error) {
      console.error('Failed to process initial data:', error);
      loadKnowledge(normalizedInitialId, {
        showDetail: options.showDetail,
        showError: options.showError,
      });
    }
  } else {
    loadKnowledge(normalizedInitialId, {
      showDetail: options.showDetail,
      showError: options.showError,
    });
  }
}
