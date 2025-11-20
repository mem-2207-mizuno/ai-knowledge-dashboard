import { CategoryFormConfig } from '../types';

export const CATEGORY_FORM_CONFIGS: CategoryFormConfig[] = [
  {
    key: 'article',
    label: '気になる記事',
    icon: '📰',
    description: '気になる記事や資料を共有。概要を添えてスムーズに参照できるようにします。',
    metadataFields: [
      {
        key: 'summary',
        label: '要約',
        type: 'textarea',
        placeholder: 'この記事の要点や気づきを簡潔にまとめましょう。',
      },
      {
        key: 'sourceType',
        label: '情報種別',
        type: 'select',
        options: [
          { label: 'Blog / Note', value: 'blog' },
          { label: 'Docs / Spec', value: 'document' },
          { label: 'Video / Talk', value: 'video' },
          { label: 'その他', value: 'other' },
        ],
        defaultValue: 'blog',
      },
    ],
    defaultStatus: 'open',
  },
  {
    key: 'question',
    label: '相談・質問',
    icon: '❓',
    description: '課題感や期限を明記してチームに相談します。',
    metadataFields: [
      {
        key: 'currentIssue',
        label: '現状課題',
        type: 'textarea',
        required: true,
        placeholder: '困っている点や背景を共有してください。',
      },
      {
        key: 'desiredResolutionDate',
        label: '解決希望日',
        type: 'date',
        helperText: '目安の期限があれば入力してください。',
      },
    ],
    statusOptions: [
      { label: '未解決', value: 'open' },
      { label: '対応中', value: 'in-progress' },
      { label: '解決', value: 'resolved' },
    ],
    defaultStatus: 'open',
  },
  {
    key: 'recruitment',
    label: '仲間募集',
    icon: '🤝',
    description: '一緒に進めるメンバーを募る投稿です。',
    metadataFields: [
      {
        key: 'projectOverview',
        label: 'プロジェクト概要',
        type: 'textarea',
        required: true,
        placeholder: '何を実現したいのか、取り組み内容を伝えましょう。',
      },
      {
        key: 'roles',
        label: '募集ロール',
        type: 'text',
        placeholder: '例: デザイナー / エンジニア / PM など',
      },
      {
        key: 'contactChannel',
        label: '連絡方法',
        type: 'text',
        placeholder: 'Slack #channel やメールアドレスなど',
      },
    ],
    statusOptions: [
      { label: '募集中', value: 'open' },
      { label: 'マッチング中', value: 'matching' },
      { label: '終了', value: 'closed' },
    ],
    defaultStatus: 'open',
  },
  {
    key: 'showcase',
    label: '成果物紹介',
    icon: '🎁',
    description: '出来上がった成果物をデモリンク付きで紹介します。',
    metadataFields: [
      {
        key: 'demoUrl',
        label: 'デモURL',
        type: 'url',
        placeholder: 'https://example.com/demo',
      },
      {
        key: 'githubUrl',
        label: 'GitHub URL',
        type: 'url',
        placeholder: 'https://github.com/...',
      },
      {
        key: 'highlights',
        label: '工夫した点',
        type: 'textarea',
        placeholder: '推しポイントや背景を共有してください。',
      },
    ],
    defaultStatus: 'published',
  },
];
