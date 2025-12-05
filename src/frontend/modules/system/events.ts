export function bindGlobalClickHandlers(options: {
  onCloseDetail: () => void;
}) {
  window.onclick = function (event) {
    const detailModal = document.getElementById('detailModal');
    if (event.target === detailModal) {
      options.onCloseDetail();
    }
  };
}
