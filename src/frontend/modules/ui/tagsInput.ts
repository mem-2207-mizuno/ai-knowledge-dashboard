import { KNOWN_TAGS } from '../data/constants';
import { escapeHtml } from './dom';

type TagInputMode = 'add' | 'edit';

const TAG_INPUT_STATE: Record<TagInputMode, string[]> = {
  add: [],
  edit: [],
};

function getTagInputElement(mode: TagInputMode): HTMLInputElement | null {
  return document.getElementById(mode === 'add' ? 'addTagInput' : 'editTagInput') as HTMLInputElement | null;
}

function renderTagChips(mode: TagInputMode) {
  const containerId = mode === 'add' ? 'addTagChips' : 'editTagChips';
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }
  const tags = TAG_INPUT_STATE[mode] || [];
  if (tags.length === 0) {
    container.innerHTML = '<span class="tag-chip-placeholder">タグを追加してください</span>';
    return;
  }
  container.innerHTML = tags
    .map(
      (tag) => `
          <span class="tag-chip tag-chip-editable">
            <span>${escapeHtml(tag)}</span>
            <button type="button" class="tag-chip-remove" data-tag="${escapeHtml(tag)}" aria-label="${escapeHtml(
        tag
      )} を削除">&times;</button>
          </span>`
    )
    .join('');
}

function setupTagChipRemoval(mode: TagInputMode) {
  const containerId = mode === 'add' ? 'addTagChips' : 'editTagChips';
  const container = document.getElementById(containerId) as HTMLElement | null;
  if (!container || container.dataset.listenerAttached) {
    return;
  }
  container.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('button[data-tag]') as HTMLButtonElement | null;
    if (!button) {
      return;
    }
    const tagValue = button.getAttribute('data-tag');
    if (!tagValue) {
      return;
    }
    removeTag(mode, tagValue);
  });
  container.dataset.listenerAttached = 'true';
}

function handleTagInputKeydown(event: KeyboardEvent, mode: TagInputMode) {
  const target = event.target as HTMLInputElement;
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault();
    commitTagFromInputElement(target, mode);
    return;
  }
  if (event.key === 'Backspace' && target.value === '' && TAG_INPUT_STATE[mode]?.length > 0) {
    TAG_INPUT_STATE[mode].pop();
    renderTagChips(mode);
  }
}

function commitTagFromInputElement(inputElement: HTMLInputElement | null, mode: TagInputMode) {
  if (!inputElement) {
    return;
  }
  const rawValue = inputElement.value || '';
  const normalized = rawValue.trim();
  if (normalized) {
    if (!TAG_INPUT_STATE[mode]) {
      TAG_INPUT_STATE[mode] = [];
    }
    if (!TAG_INPUT_STATE[mode].includes(normalized)) {
      TAG_INPUT_STATE[mode].push(normalized);
      renderTagChips(mode);
    }
  }
  inputElement.value = '';
}

function removeTag(mode: TagInputMode, tagValue: string) {
  const index = TAG_INPUT_STATE[mode]?.indexOf(tagValue);
  if (index !== undefined && index > -1) {
    TAG_INPUT_STATE[mode].splice(index, 1);
    renderTagChips(mode);
  }
}

function hydrateTagSuggestionList() {
  const datalist = document.getElementById('tagSuggestionsList');
  if (!datalist) {
    return;
  }
  datalist.innerHTML = KNOWN_TAGS.map((tag) => `<option value="${escapeHtml(tag.name)}"></option>`).join('');
}

export function setupTagInputs() {
  hydrateTagSuggestionList();
  (['add', 'edit'] as TagInputMode[]).forEach((mode) => {
    const input = getTagInputElement(mode);
    if (input && !input.dataset.listenerAttached) {
      input.addEventListener('keydown', (event) => handleTagInputKeydown(event as KeyboardEvent, mode));
      input.addEventListener('blur', () => commitTagFromInputElement(input, mode));
      input.dataset.listenerAttached = 'true';
    }
    setupTagChipRemoval(mode);
  });
}

export function commitPendingTagInput(mode: TagInputMode) {
  const input = getTagInputElement(mode);
  if (input && input.value) {
    commitTagFromInputElement(input, mode);
  }
}

export function setTags(mode: TagInputMode, tags: string[] | string) {
  const normalized = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(',').map((tag) => tag.trim())
      : [];
  TAG_INPUT_STATE[mode] = normalized
    .map((tag) => tag.trim())
    .filter((tag, index, arr) => tag && arr.indexOf(tag) === index);
  renderTagChips(mode);
  const input = getTagInputElement(mode);
  if (input) {
    input.value = '';
  }
}

export function getTags(mode: TagInputMode): string[] {
  return TAG_INPUT_STATE[mode] ? [...TAG_INPUT_STATE[mode]] : [];
}
