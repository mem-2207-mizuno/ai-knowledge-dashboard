export type EditorMode = 'add' | 'edit';

declare const EasyMDE: any;

const EASYMDE_OPTIONS = {
  spellChecker: false,
  status: false,
  autoDownloadFontAwesome: false,
  renderingConfig: {
    singleLineBreaks: false,
  },
  toolbar: [
    'bold',
    'italic',
    'heading',
    '|',
    'quote',
    'unordered-list',
    'ordered-list',
    '|',
    'link',
    'code',
    '|',
    'preview',
    'side-by-side',
    'fullscreen',
    '|',
    'guide',
  ],
};

const editors: Record<EditorMode, any> = {
  add: null,
  edit: null,
};

function createEditor(textarea: HTMLTextAreaElement) {
  if (typeof EasyMDE === 'undefined') {
    console.warn('EasyMDE is not loaded.');
    return null;
  }
  return new EasyMDE(
    Object.assign({}, EASYMDE_OPTIONS, {
      element: textarea,
      placeholder: 'Markdownで詳細を記述できます',
    }),
  );
}

export function initMarkdownEditors() {
  (['add', 'edit'] as EditorMode[]).forEach(mode => {
    const textareaId = mode === 'add' ? 'addComment' : 'editComment';
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    if (textarea && !editors[mode]) {
      editors[mode] = createEditor(textarea);
    }
  });
}

export function getMarkdownValue(mode: EditorMode, fallbackTextareaId: string): string {
  const editor = editors[mode];
  if (editor && typeof editor.value === 'function') {
    return editor.value().trim();
  }
  const textarea = document.getElementById(fallbackTextareaId) as HTMLTextAreaElement | null;
  return textarea ? textarea.value.trim() : '';
}

export function setMarkdownValue(mode: EditorMode, fallbackTextareaId: string, value: string) {
  const resolved = value || '';
  const editor = editors[mode];
  if (editor && typeof editor.value === 'function') {
    editor.value(resolved);
    return;
  }
  const textarea = document.getElementById(fallbackTextareaId) as HTMLTextAreaElement | null;
  if (textarea) {
    textarea.value = resolved;
  }
}

export function refreshMarkdownEditor(mode: EditorMode) {
  const editor = editors[mode];
  if (editor && editor.codemirror) {
    setTimeout(() => editor.codemirror.refresh(), 0);
  }
}
