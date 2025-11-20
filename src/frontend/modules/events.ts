export function bindGlobalClickHandlers(options: {
  onCloseDetail: () => void;
  onCloseAdd: () => void;
  onCloseEdit: () => void;
}) {
  window.onclick = function (event) {
    const detailModal = document.getElementById('detailModal');
    const addModal = document.getElementById('addModal');
    const editModal = document.getElementById('editModal');
    if (event.target === detailModal) {
      options.onCloseDetail();
    }
    if (event.target === addModal) {
      options.onCloseAdd();
    }
    if (event.target === editModal) {
      options.onCloseEdit();
    }
  };
}
