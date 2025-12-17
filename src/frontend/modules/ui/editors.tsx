import { BlockNoteEditor, PartialBlock } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import { createRoot, Root } from 'react-dom/client';
import { getKnowledgeImageData, uploadKnowledgeImage } from '../data/api';
import { showNotification } from '../system/notifications';

export type EditorMode = 'add' | 'edit';

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const IMAGE_SKELETON = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="#eef1f5"/>
        <stop offset="50%" stop-color="#e3e8ef"/>
        <stop offset="100%" stop-color="#eef1f5"/>
      </linearGradient>
    </defs>
    <rect width="640" height="360" rx="12" fill="url(#g)"/>
    <rect x="24" y="24" width="220" height="20" rx="10" fill="#d7dde6"/>
    <rect x="24" y="56" width="360" height="16" rx="8" fill="#dfe5ee"/>
    <rect x="24" y="80" width="280" height="16" rx="8" fill="#dfe5ee"/>
    <g opacity="0.35">
      <path d="M278 166c0-17 14-30 30-30h24c17 0 30 13 30 30v24c0 17-13 30-30 30h-24c-16 0-30-13-30-30v-24zm30-14a14 14 0 100 28 14 14 0 000-28zm-10 56h92l-22-30-18 24-14-18-38 24z" fill="#9aa6b2"/>
    </g>
    <text x="50%" y="80%" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="16" fill="#7b8794">
      画像を読み込み中…
    </text>
  </svg>`,
)}`;

// BlockNoteのimage propsは未知フィールドを保持しないことがあるため、
// 表示用にURLを差し替える場合はブロックIDに紐づけて元URLを保持する。
const imageSourceByBlockId = new Map<string, string>();

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

function tryParseBlocksJson(input: string): PartialBlock[] | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;
  const looksLikeJson = trimmed.startsWith('[') || trimmed.startsWith('{');
  if (!looksLikeJson) return null;
  try {
    const parsed = JSON.parse(trimmed);
    const blocks = Array.isArray(parsed) ? parsed : parsed?.blocks;
    if (!Array.isArray(blocks) || blocks.length === 0) return null;
    const first = blocks[0];
    if (!first || typeof first !== 'object' || typeof (first as any).type !== 'string') return null;
    return blocks as PartialBlock[];
  } catch {
    return null;
  }
}

function extractDriveFileId(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return null;
  if (trimmed.startsWith('gasimg:')) return trimmed.slice('gasimg:'.length);
  // 旧: ?img=<fileId>
  const imgMatch = trimmed.match(/[?&]img=([^&]+)/);
  if (imgMatch?.[1]) return imgMatch[1];
  // Drive: uc?export=view&id=<fileId>
  const idMatch = trimmed.match(/[?&]id=([^&]+)/);
  if (idMatch?.[1] && trimmed.includes('drive.google.com')) return idMatch[1];
  return null;
}

function replaceImageUrlsWithDataUrl(
  blocks: PartialBlock[],
  byId: Record<string, string>,
): PartialBlock[] {
  const walk = (items: any[]): any[] =>
    items.map(block => {
      if (!block || typeof block !== 'object') return block;
      const next = { ...block };
      if (next.type === 'image' && next.props && typeof next.props === 'object') {
        const blockId = typeof (next as any).id === 'string' ? (next as any).id : '';
        const fallbackSource = blockId ? imageSourceByBlockId.get(blockId) : null;
        const sourceUrl = fallbackSource ?? next.props.url;
        const fileId = extractDriveFileId(sourceUrl);
        if (fileId && byId[fileId]) {
          next.props = { ...next.props, url: byId[fileId] };
          if (blockId) {
            imageSourceByBlockId.delete(blockId);
          }
        }
      }
      if (Array.isArray(next.children) && next.children.length > 0) {
        next.children = walk(next.children);
      }
      return next;
    });
  return walk(blocks as any) as PartialBlock[];
}

function prepareBlocksForDisplay(blocks: PartialBlock[]): PartialBlock[] {
  const walk = (items: any[]): any[] =>
    items.map(block => {
      if (!block || typeof block !== 'object') return block;
      const next = { ...block };
      if (next.type === 'image' && next.props && typeof next.props === 'object') {
        const url = String(next.props.url || '');
        const fileId = extractDriveFileId(url);
        // gasimg/drive/旧img はそのままだと表示できない(ORB/403)ことがあるのでプレースホルダへ。
        if (fileId) {
          const blockId = typeof (next as any).id === 'string' ? (next as any).id : '';
          if (blockId && !imageSourceByBlockId.has(blockId)) {
            imageSourceByBlockId.set(blockId, url);
          }
          next.props = {
            ...next.props,
            url: IMAGE_SKELETON || TRANSPARENT_PIXEL,
          };
        }
      }
      if (Array.isArray(next.children) && next.children.length > 0) {
        next.children = walk(next.children);
      }
      return next;
    });
  return walk(blocks as any) as PartialBlock[];
}

async function hydratePrivateDriveImages(editor: BlockNoteEditor) {
  // editor.document はBlock配列
  const blocks = editor.document as unknown as PartialBlock[];
  const ids = new Set<string>();
  const collect = (items: any[]) => {
    items.forEach(block => {
      if (!block || typeof block !== 'object') return;
      if (block.type === 'image' && block.props) {
        const blockId = typeof block.id === 'string' ? block.id : '';
        const fallbackSource = blockId ? imageSourceByBlockId.get(blockId) : null;
        const sourceUrl = fallbackSource ?? block.props.url;
        const fileId = extractDriveFileId(sourceUrl);
        if (fileId) ids.add(fileId);
      }
      if (Array.isArray(block.children) && block.children.length > 0) {
        collect(block.children);
      }
    });
  };
  collect(blocks as any);
  if (ids.size === 0) return;

  const byId: Record<string, string> = {};
  await Promise.all(
    Array.from(ids).map(async fileId => {
      try {
        const { mimeType, base64 } = await getKnowledgeImageData(fileId);
        if (mimeType && base64) {
          byId[fileId] = `data:${mimeType};base64,${base64}`;
        }
      } catch (error) {
        console.warn('Failed to hydrate image from Drive:', fileId, error);
      }
    }),
  );
  if (Object.keys(byId).length === 0) return;

  const nextBlocks = replaceImageUrlsWithDataUrl(blocks, byId);
  editor.replaceBlocks(editor.document, nextBlocks);
}

async function replaceDataUrlImagesForSave(editor: BlockNoteEditor) {
  const blocks = editor.document as unknown as PartialBlock[];
  const uploads = new Map<string, Promise<string>>();

  const walk = async (items: any[]): Promise<any[]> => {
    const nextItems: any[] = [];
    for (const block of items) {
      if (!block || typeof block !== 'object') {
        nextItems.push(block);
        continue;
      }
      const next = { ...block };
      if (next.type === 'image' && next.props && typeof next.props === 'object') {
        // 表示用に差し替えた場合は、ブロックIDから元URL(gasimg:等)を復元して保存する
        const blockId = typeof (next as any).id === 'string' ? (next as any).id : '';
        const fallbackSource = blockId ? imageSourceByBlockId.get(blockId) : null;
        if (fallbackSource && fallbackSource.startsWith('gasimg:')) {
          next.props = { ...next.props, url: fallbackSource };
        } else {
          const url = String(next.props.url || '');
          if (url.startsWith('data:image/')) {
            const filename =
              typeof next.props.name === 'string' && next.props.name.trim()
                ? next.props.name.trim()
                : `image-${Date.now()}.png`;
            const task =
              uploads.get(url) ||
              uploadKnowledgeImage({ dataUrl: url, filename }).then(result => String(result || ''));
            uploads.set(url, task);
            try {
              const gasUrl = await task;
              if (gasUrl) {
                next.props = { ...next.props, url: gasUrl };
                if (blockId) {
                  imageSourceByBlockId.set(blockId, gasUrl);
                }
              }
            } catch (error) {
              console.warn('Failed to migrate dataURL image to Drive:', error);
            }
          }
        }
      }
      if (Array.isArray(next.children) && next.children.length > 0) {
        next.children = await walk(next.children);
      }
      nextItems.push(next);
    }
    return nextItems;
  };

  const migrated = await walk(blocks as any);
  if (uploads.size === 0) {
    return;
  }
  editor.replaceBlocks(editor.document, migrated as any);
}

function toBlocks(editor: BlockNoteEditor, markdown: string): PartialBlock[] {
  try {
    // 先頭/末尾の空白・改行を保持したいのでtrimしない
    const raw = markdown ?? '';
    const jsonBlocks = tryParseBlocksJson(raw);
    if (jsonBlocks) {
      return jsonBlocks;
    }
    // 空文字（または空白のみ）の場合だけ空配列扱いにする
    const parsed = raw.length > 0 ? editor.tryParseMarkdownToBlocks(raw) : [];
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
  editor.replaceBlocks(editor.document, prepareBlocksForDisplay(nextBlocks));
  // 編集/閲覧どちらも、表示はdataURLに解決して安定させる（保存前にgasimgへ戻す）
  void hydratePrivateDriveImages(editor);
}

function renderBlockNote(
  container: HTMLElement,
  markdown: string,
  options?: { readOnly?: boolean },
): { root: Root; editor: BlockNoteEditor; container: HTMLElement } {
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('FileReader error'));
      reader.readAsDataURL(file);
    });

  const editor = BlockNoteEditor.create({
    defaultStyles: true,
    uploadFile: options?.readOnly
      ? undefined
      : async (file: File) => {
          const maxBytes = 5 * 1024 * 1024;
          if (file.size > maxBytes) {
            showNotification('画像サイズが大きすぎます（最大 5MB）', { type: 'error' });
            throw new Error('Image size exceeded (max 5MB)');
          }
          try {
            const dataUrl = await fileToDataUrl(file);
            // ここでは dataURL を返して即時プレビューを表示する。
            // Driveへのアップロード＆gasimg置換は保存直前（prepareEditorForSave）で行う。
            return dataUrl;
          } catch (error: any) {
            console.error('Failed to upload image:', error);
            showNotification(
              error?.message ||
                '画像のアップロードに失敗しました（権限/容量/設定を確認してください）',
              { type: 'error' },
            );
            throw error;
          }
        },
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
      // 保存時に改行やインデントが落ちないようtrimしない
      return instance.editor.blocksToMarkdownLossy(instance.editor.document);
    } catch (error) {
      console.error('Failed to read BlockNote content:', error);
    }
  }

  const fallback = document.getElementById(fallbackId) as HTMLTextAreaElement | null;
  return fallback ? fallback.value : '';
}

export async function prepareEditorForSave(mode: EditorMode): Promise<void> {
  const instance = editors[mode];
  if (!instance) {
    return;
  }
  await replaceDataUrlImagesForSave(instance.editor);
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
