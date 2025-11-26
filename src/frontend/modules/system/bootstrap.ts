import { setupForms } from '../ui/forms';
import { setupFormControls } from '../ui/metadata';
import { setupTagInputs, setTags } from '../ui/tagsInput';
import { updateCategoryUI, updateViewUI, updateInsights } from '../ui/filters';
import { normalizeKnowledgeId } from './utils';
import { displayKnowledge, loadKnowledge } from '../data/knowledgeList';

interface BootstrapOptions {
  initialData: any;
  initialId: any;
  initialView?: 'modal' | 'panel';
  showDetail: (id: number, options?: boolean | { updateHistory?: boolean; mode?: 'modal' | 'panel' }) => void;
  showError: (error: any) => void;
  closeDetail: () => void;
  closeAdd: () => void;
  closeEdit: () => void;
}

function resolveInitialView(options: BootstrapOptions): 'modal' | 'panel' {
  if (options.initialView === 'panel') {
    return 'panel';
  }
  const viewParam = new URL(window.location.href).searchParams.get('view');
  return viewParam === 'panel' ? 'panel' : 'modal';
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
  const initialViewMode = resolveInitialView(options);
  const triggerInitialOpen = (id: number, mode: 'modal' | 'panel') => {
    // 二段階で遅延呼び出しして、GAS配信時の初期レンダリング遅延にも耐える
    setTimeout(() => options.showDetail(id, { updateHistory: false, mode }), 100);
    setTimeout(() => options.showDetail(id, { updateHistory: false, mode }), 400);
  };

  if (initialData) {
    try {
      displayKnowledge(initialData);
      if (normalizedInitialId !== null) {
        triggerInitialOpen(normalizedInitialId, initialViewMode);
      }
    } catch (error) {
      console.error('Failed to process initial data:', error);
      loadKnowledge(
        normalizedInitialId,
        {
          showDetail: options.showDetail,
          showError: options.showError,
        },
        { mode: initialViewMode },
      );
    }
  } else {
    loadKnowledge(
      normalizedInitialId,
      {
        showDetail: options.showDetail,
        showError: options.showError,
      },
      { mode: initialViewMode },
    );
  }
}
