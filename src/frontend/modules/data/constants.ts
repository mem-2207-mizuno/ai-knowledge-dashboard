import type { CategoryFormConfig, TagRecord } from '../../types';

declare const SERVER_DATA: any;

export type CategoryChipConfig = {
  id: string;
  label: string;
  icon: string;
};

export const referenceData = SERVER_DATA?.referenceData || {};

export const CATEGORY_CONFIG: CategoryChipConfig[] = [
  { id: 'all', label: 'すべて', icon: '🌐' },
  { id: 'article', label: '気になる記事', icon: '📰' },
  { id: 'question', label: '相談・質問', icon: '❓' },
  { id: 'recruitment', label: '仲間募集', icon: '🤝' },
  { id: 'showcase', label: '成果物紹介', icon: '🎁' },
];

export const CATEGORY_FORM_CONFIGS: CategoryFormConfig[] = Array.isArray(
  referenceData.categories
)
  ? referenceData.categories
  : [];

export const KNOWN_TAGS: TagRecord[] = Array.isArray(referenceData.tags)
  ? referenceData.tags
  : [];

export const DEFAULT_CATEGORY_KEY = 'article';

export const FORM_CATEGORY_OPTIONS: CategoryFormConfig[] =
  CATEGORY_FORM_CONFIGS.length > 0
    ? CATEGORY_FORM_CONFIGS
    : CATEGORY_CONFIG.filter((config) => config.id && config.id !== 'all').map(
        (config) => ({
          key: config.id as CategoryFormConfig['key'],
          label: config.label,
          icon: config.icon,
          metadataFields: [],
        })
      );

export const DEFAULT_CATEGORY_VALUE =
  FORM_CATEGORY_OPTIONS.find((config) => config.key === DEFAULT_CATEGORY_KEY)?.key ||
  (FORM_CATEGORY_OPTIONS[0] ? FORM_CATEGORY_OPTIONS[0].key : '');
