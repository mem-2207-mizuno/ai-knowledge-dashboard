import { initClientState } from './modules/data/state';
import {
  openAddModal as openAddModalForm,
  closeAddModal as closeAddModalForm,
  submitKnowledge as submitKnowledgeForm,
  openEditModal as openEditModalForm,
  closeEditModal as closeEditModalForm,
} from './modules/ui/forms';
import {
  setCategory as setCategoryFilter,
  setView as setViewFilter,
  searchKnowledge as searchKnowledgeCore,
  toggleTag as toggleTagCore,
} from './modules/ui/filters';
import { bootstrapApp } from './modules/system/bootstrap';
import {
  initDetailController,
  showDetail,
  closeModal,
  copyShareLink,
  submitComment,
  addLike,
  deleteComment,
  handleCommentKeydown,
} from './modules/controllers/detailController';
import { initFormsController, submitUpdate } from './modules/controllers/formsController';
import { showError } from './modules/system/errors';
import '@blocknote/core/style.css';
import '@blocknote/mantine/style.css';

declare const SERVER_DATA: any;
initClientState();
initDetailController({
  showError,
});
initFormsController({
  closeDetailModal: closeModal,
  showDetail,
  showError,
});

const setCategory = (category: string) => setCategoryFilter(category);
const setView = (view: 'all' | 'favorites') => setViewFilter(view);
const searchKnowledge = () => searchKnowledgeCore();
const toggleTag = (tag: string) => toggleTagCore(tag);

window.onload = function () {
  bootstrapApp({
    initialData: SERVER_DATA.initialData,
    initialId: SERVER_DATA.initialId,
    showDetail,
    showError,
    closeDetail: closeModal,
    closeAdd: closeAddModalForm,
    closeEdit: closeEditModalForm,
  });
};

const globalScope = window as any;
Object.assign(globalScope, {
  openAddModal: openAddModalForm,
  closeAddModal: closeAddModalForm,
  submitKnowledge: submitKnowledgeForm,
  closeModal,
  searchKnowledge,
  setView,
  setCategory,
  toggleTag,
  showDetail,
  addLike,
  submitComment,
  deleteComment,
  handleCommentKeydown,
  copyShareLink,
  openEditModal: openEditModalForm,
  closeEditModal: closeEditModalForm,
  submitUpdate,
});
