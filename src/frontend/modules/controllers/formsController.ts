import {
  submitUpdate as submitUpdateForm,
  closeEditModal as closeEditModalForm,
} from '../ui/forms';
import { loadKnowledge } from '../data/knowledgeList';

type FormControllerOptions = {
  closeDetailModal: () => void;
  showDetail: (id: any, updateHistory?: boolean) => void;
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
      loadKnowledge(null, {
        showDetail,
        showError,
      });
      alert('ナレッジを更新しました！');
    },
    onError: message => showError(message),
  });
}
