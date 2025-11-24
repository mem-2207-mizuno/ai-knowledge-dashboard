import { showNotification } from './notifications';

export function showError(error: any) {
  console.error('showError called with:', error);
  const errorMessage =
    typeof error === 'string' ? error : error?.message || error?.toString() || '不明なエラー';
  showNotification(`エラーが発生しました: ${errorMessage}`, { type: 'error', duration: 5000 });
  const grid = document.getElementById('knowledgeGrid');
  if (grid && grid.innerHTML.includes('class="loading"')) {
    grid.innerHTML = `<div class="error">データの読み込みに失敗しました: ${errorMessage}</div>`;
  }
}
