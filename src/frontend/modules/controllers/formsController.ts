import {
  submitUpdate as submitUpdateForm,
  closeEditModal as closeEditModalForm,
} from '../ui/forms';
import { loadKnowledge } from '../data/knowledgeList';
import { showNotification } from '../system/notifications';

type FormControllerOptions = {
  closeDetailModal: () => void;
  showDetail: (
    id: any,
    options?: boolean | { updateHistory?: boolean; mode?: 'modal' | 'panel' },
  ) => void;
  showError: (error: any) => void;
};

let controllerOptions: FormControllerOptions | null = null;

export function initFormsController(options: FormControllerOptions) {
  controllerOptions = options;
}

function requireOptions(): FormControllerOptions {
  if (!controllerOptions) {
    throw new Error('Forms controller has not been initialized');
  }
  return controllerOptions;
}

export function submitUpdate(event: Event) {
  const { closeDetailModal, showDetail, showError } = requireOptions();
  submitUpdateForm(event, {
    onSuccess: () => {
      closeEditModalForm();
      closeDetailModal();
      const viewParam = new URL(window.location.href).searchParams.get('view');
      const mode = viewParam === 'panel' ? 'panel' : 'modal';
      loadKnowledge(
        null,
        {
          showDetail,
          showError,
        },
        { mode },
      );
      showNotification('ナレッジを更新しました', { type: 'success' });
    },
    onError: message => showError(message),
  });
}
