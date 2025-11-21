import { BlockNoteEditor, PartialBlock } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import { createRoot, Root } from 'react-dom/client';

export type EditorMode = 'add' | 'edit';

type EditorInstance = {
  root: Root;
  editor: BlockNoteEditor;
  container: HTMLElement;
};

type ViewerInstance = {
  root: Root;
  editor: BlockNoteEditor;
  container: HTMLElement;
};

const editors: Partial<Record<EditorMode, EditorInstance>> = {};
const viewers: Record<string, ViewerInstance> = {};

function toBlocks(editor: BlockNoteEditor, markdown: string): PartialBlock[] {
  try {
    const normalized = (markdown || '').trim();
    const parsed = normalized ? editor.tryParseMarkdownToBlocks(normalized) : [];
    if (parsed && parsed.length > 0) {
      return parsed;
    }
  } catch (error) {
    console.error('Failed to parse markdown into BlockNote blocks:', error);
  }
  return [{ type: 'paragraph', content: [] }];
}

function setEditorContent(editor: BlockNoteEditor, markdown: string) {
  const nextBlocks = toBlocks(editor, markdown);
  editor.replaceBlocks(editor.document, nextBlocks);
}

function renderBlockNote(
  container: HTMLElement,
  markdown: string,
  options?: { readOnly?: boolean },
): { root: Root; editor: BlockNoteEditor; container: HTMLElement } {
  const editor = BlockNoteEditor.create({
    defaultStyles: true,
  });
  setEditorContent(editor, markdown);

  const root = createRoot(container);
  root.render(
    <BlockNoteView
      editor={editor}
      editable={options?.readOnly ? false : true}
      formattingToolbar={options?.readOnly ? false : undefined}
      linkToolbar={options?.readOnly ? false : undefined}
      slashMenu={options?.readOnly ? false : undefined}
      emojiPicker={options?.readOnly ? false : undefined}
      sideMenu={options?.readOnly ? false : undefined}
      filePanel={false}
      tableHandles={options?.readOnly ? false : undefined}
      theme="light"
    />,
  );

  return { root, editor, container };
}

export function initMarkdownEditors() {
  const targets: Record<EditorMode, string> = {
    add: 'addComment',
    edit: 'editComment',
  };

  (Object.keys(targets) as EditorMode[]).forEach(mode => {
    const container = document.getElementById(targets[mode]) as HTMLElement | null;
    if (!container || editors[mode]) {
      return;
    }
    editors[mode] = renderBlockNote(container, '', { readOnly: false });
  });
}

export function getMarkdownValue(mode: EditorMode, fallbackId: string): string {
  const instance = editors[mode];
  if (instance) {
    try {
      return instance.editor.blocksToMarkdownLossy(instance.editor.document).trim();
    } catch (error) {
      console.error('Failed to read BlockNote content:', error);
    }
  }

  const fallback = document.getElementById(fallbackId) as HTMLTextAreaElement | null;
  return fallback ? fallback.value.trim() : '';
}

export function setMarkdownValue(mode: EditorMode, fallbackId: string, value: string) {
  const instance = editors[mode];
  if (instance) {
    setEditorContent(instance.editor, value || '');
    return;
  }
  const fallback = document.getElementById(fallbackId) as HTMLTextAreaElement | null;
  if (fallback) {
    fallback.value = value || '';
  }
}

export function refreshMarkdownEditor(mode: EditorMode) {
  const instance = editors[mode];
  if (instance) {
    setTimeout(() => instance.editor.focus(), 0);
  }
}

export function renderReadonlyMarkdown(containerId: string, markdown: string) {
  const container = document.getElementById(containerId) as HTMLElement | null;
  if (!container) {
    return;
  }

  const cached = viewers[containerId];
  if (cached && cached.container === container && cached.container.isConnected) {
    setEditorContent(cached.editor, markdown || '');
    cached.editor.isEditable = false;
    return;
  }

  if (cached && cached.root) {
    cached.root.unmount();
  }

  viewers[containerId] = renderBlockNote(container, markdown || '', { readOnly: true });
}
