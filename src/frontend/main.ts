import { initClientState } from './modules/data/state';
import {
  openAddModal as openAddModalForm,
  closeAddModal as closeAddModalForm,
  openEditModal as openEditModalForm,
  closeEditModal as closeEditModalForm,
} from './modules/ui/forms';
import {
  setCategory as setCategoryFilter,
  setView as setViewFilter,
  searchKnowledge as searchKnowledgeCore,
  toggleTag as toggleTagCore,
  setSort as setSortFilter,
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
  closeDetailPanel,
  openDetailPanel,
  archiveKnowledge,
} from './modules/controllers/detailController';
import { initFormsController, submitKnowledge, submitUpdate } from './modules/controllers/formsController';
import { showError } from './modules/system/errors';
import { showNotification } from './modules/system/notifications';
import '@blocknote/core/style.css';
import '@blocknote/mantine/style.css';

declare const SERVER_DATA: any;
initClientState();
initDetailController({
  showError,
});
initFormsController({
  closeDetailModal: closeModal,
  closeAddModal: closeAddModalForm,
  showDetail,
  showError,
});

const handleSetCategory = (category: string) => setCategoryFilter(category);
const handleSetView = (view: 'all' | 'favorites' | 'archived') => setViewFilter(view);
const handleSetSort = (sort: 'asc' | 'desc') => setSortFilter(sort);
const handleSearchKnowledge = () => searchKnowledgeCore();
const handleToggleTag = (tag: string) => toggleTagCore(tag);

window.onload = function () {
  bootstrapApp({
    initialData: SERVER_DATA.initialData,
    initialId: SERVER_DATA.initialId,
    initialView: SERVER_DATA.initialView,
    showDetail,
    showError,
    closeDetail: closeModal,
    closeAdd: closeAddModalForm,
    closeEdit: closeEditModalForm,
  });
};

Object.assign(window as any, {
  openAddModal: openAddModalForm,
  closeAddModal: closeAddModalForm,
  submitKnowledge,
  closeModal,
  searchKnowledge: handleSearchKnowledge,
  setView: handleSetView,
  setCategory: handleSetCategory,
  toggleTag: handleToggleTag,
  setSort: handleSetSort,
  showDetail,
  addLike,
  submitComment,
  deleteComment,
  handleCommentKeydown,
  copyShareLink,
  openDetailPanel,
  archiveKnowledge,
  openEditModal: openEditModalForm,
  closeEditModal: closeEditModalForm,
  submitUpdate,
  showNotification,
  closeDetailPanel,
});
