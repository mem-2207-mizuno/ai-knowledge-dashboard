import type { CategoryMetadataField } from '../../../types';
import {
  CATEGORY_FORM_CONFIGS,
  DEFAULT_CATEGORY_VALUE,
  FORM_CATEGORY_OPTIONS,
} from '../data/constants';
import { escapeHtml } from './dom';

type MetadataMode = 'add' | 'edit';

function populateCategorySelect(selectId: string) {
  const selectEl = document.getElementById(selectId) as HTMLSelectElement | null;
  if (!selectEl) {
    return;
  }
  if (!FORM_CATEGORY_OPTIONS || FORM_CATEGORY_OPTIONS.length === 0) {
    selectEl.innerHTML = '';
    return;
  }
  selectEl.innerHTML = FORM_CATEGORY_OPTIONS.map(config => {
    const label = `${config.icon ? `${config.icon} ` : ''}${config.label}`;
    return `<option value="${config.key}">${label}</option>`;
  }).join('');
}

function createMetadataFieldMarkup(
  field: CategoryMetadataField,
  value: unknown,
  mode: MetadataMode,
): string {
  const containerId = `${mode}-meta-${field.key}`;
  const requiredAttr = ''; // 全フィールド任意入力にする
  const placeholderAttr = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : '';
  const helper = field.helperText
    ? `<div class="property-helper">${escapeHtml(field.helperText)}</div>`
    : '';
  let resolvedValue = '';
  if (Array.isArray(value)) {
    resolvedValue = value.join(', ');
  } else if (typeof value === 'string') {
    resolvedValue = value;
  } else if (typeof field.defaultValue === 'string') {
    resolvedValue = field.defaultValue;
  }

  let inputHtml = '';
  if (field.type === 'textarea') {
    inputHtml = `<textarea id="${containerId}" data-metadata-key="${field.key}" ${requiredAttr} ${placeholderAttr}>${escapeHtml(
      resolvedValue,
    )}</textarea>`;
  } else if (field.type === 'select') {
    const options =
      field.options?.map(option => {
        const selected = resolvedValue && option.value === resolvedValue ? 'selected' : '';
        return `<option value="${option.value}" ${selected}>${option.label}</option>`;
      }) || [];
    inputHtml = `<select id="${containerId}" data-metadata-key="${field.key}" ${requiredAttr}>
          ${options.join('')}
        </select>`;
  } else {
    let inputType = 'text';
    if (field.type === 'url') {
      inputType = 'url';
    } else if (field.type === 'date') {
      inputType = 'date';
    }
    inputHtml = `<input type="${inputType}" id="${containerId}" data-metadata-key="${field.key}" value="${escapeHtml(
      resolvedValue,
    )}" ${requiredAttr} ${placeholderAttr} />`;
  }

  return `
        <div class="property-row metadata-row">
          <div class="property-label">${field.label}</div>
          <div class="property-control">
            ${inputHtml}
            ${helper}
          </div>
        </div>
      `;
}

export function renderMetadataFields(mode: MetadataMode, metadata: Record<string, any> = {}) {
  const containerId = mode === 'add' ? 'addMetadataFields' : 'editMetadataFields';
  const separatorId = mode === 'add' ? 'addMetadataSeparator' : 'editMetadataSeparator';
  const container = document.getElementById(containerId);
  const separator = document.getElementById(separatorId);
  if (!container) {
    return;
  }
  const selectEl = document.getElementById(
    mode === 'add' ? 'addCategory' : 'editCategory',
  ) as HTMLSelectElement | null;
  if (!selectEl) {
    container.innerHTML = '';
    if (separator) separator.style.display = 'none';
    return;
  }
  const categoryKey = selectEl.value;
  const config = CATEGORY_FORM_CONFIGS.find(cat => cat.key === categoryKey);
  if (!config || !config.metadataFields || config.metadataFields.length === 0) {
    container.innerHTML = '';
    if (separator) separator.style.display = 'none';
    return;
  }
  if (separator) separator.style.display = 'block';
  container.innerHTML = config.metadataFields
    .map(field => createMetadataFieldMarkup(field, metadata[field.key], mode))
    .join('');
}

export function collectMetadata(mode: MetadataMode): Record<string, any> {
  const containerId = mode === 'add' ? 'addMetadataFields' : 'editMetadataFields';
  const container = document.getElementById(containerId);
  if (!container) {
    return {};
  }
  const metadataInputs = container.querySelectorAll('[data-metadata-key]');
  const result: Record<string, any> = {};
  metadataInputs.forEach(input => {
    const key = input.getAttribute('data-metadata-key');
    if (!key) {
      return;
    }
    let value: string | string[] = '';
    if (input.tagName === 'SELECT') {
      const selectEl = input as HTMLSelectElement;
      if (selectEl.multiple) {
        value = Array.from(selectEl.options)
          .filter(option => option.selected)
          .map(option => option.value);
      } else {
        value = selectEl.value.trim();
      }
    } else {
      value = (input as HTMLInputElement | HTMLTextAreaElement).value.trim();
    }
    if (Array.isArray(value) && value.length > 0) {
      result[key] = value;
    } else if (value) {
      result[key] = value;
    }
  });
  return result;
}

export function setupFormControls() {
  populateCategorySelect('addCategory');
  populateCategorySelect('editCategory');
  const addSelect = document.getElementById('addCategory') as HTMLSelectElement | null;
  if (addSelect) {
    addSelect.value = DEFAULT_CATEGORY_VALUE || addSelect.value;
    addSelect.addEventListener('change', () => renderMetadataFields('add'));
    renderMetadataFields('add');
  }
  const editSelect = document.getElementById('editCategory') as HTMLSelectElement | null;
  if (editSelect) {
    if (!editSelect.value && DEFAULT_CATEGORY_VALUE) {
      editSelect.value = DEFAULT_CATEGORY_VALUE;
    }
    editSelect.addEventListener('change', () => renderMetadataFields('edit'));
    renderMetadataFields('edit');
  }
}
