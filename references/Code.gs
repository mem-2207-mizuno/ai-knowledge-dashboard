var global = this;

function doGet(e) {
  return global.doGet(e);
}
function getKnowledgeList(filters) {
  return global.getKnowledgeList(filters);
}
function getKnowledgeDetail(id) {
  return global.getKnowledgeDetail(id);
}
function addKnowledge(knowledge) {
  return global.addKnowledge(knowledge);
}
function updateKnowledge(id, knowledge) {
  return global.updateKnowledge(id, knowledge);
}
function addComment(id, comment, author) {
  return global.addComment(id, comment, author);
}
function deleteComment(id, knowledgeId) {
  return global.deleteComment(id, knowledgeId);
}
function addLike(id) {
  return global.addLike(id);
}
function testSpreadsheetAccess() {
  return global.testSpreadsheetAccess();
}
function toggleCommentReaction(commentId, emoji, clientId) {
  return global.toggleCommentReaction(commentId, emoji, clientId);
}
function uploadKnowledgeImage(payload) {
  return global.uploadKnowledgeImage(payload);
}
function authorizeDrive() {
  return global.authorizeDrive();
}
function getKnowledgeImageData(fileId) {
  return global.getKnowledgeImageData(fileId);
}
function ensureUploadFolder(folderName) {
  return global.ensureUploadFolder(folderName);
}

('use strict');
var _entry = (() => {
  // src/config/Config.ts
  var Config = {
    /**
     * スプレッドシートIDを取得（Script Propertiesから）
     */
    getSpreadsheetId: () => {
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      if (!spreadsheetId) {
        throw new Error(
          'SPREADSHEET_ID\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002GAS\u30A8\u30C7\u30A3\u30BF\u306E\u300C\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u306E\u8A2D\u5B9A\u300D\u2192\u300C\u30B9\u30AF\u30EA\u30D7\u30C8 \u30D7\u30ED\u30D1\u30C6\u30A3\u300D\u304B\u3089\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002',
        );
      }
      return spreadsheetId.trim();
    },
  };

  // src/services/SheetService.ts
  var SheetService = class {
    /**
     * スプレッドシートを安全に開く
     */
    static openSpreadsheet() {
      const spreadsheetId = Config.getSpreadsheetId();
      try {
        if (!spreadsheetId || spreadsheetId.trim().length === 0) {
          throw new Error(
            '\u30B9\u30D7\u30EC\u30C3\u30C9\u30B7\u30FC\u30C8ID\u304C\u7A7A\u3067\u3059',
          );
        }
        const spreadsheet = SpreadsheetApp.openById(spreadsheetId.trim());
        return spreadsheet;
      } catch (error) {
        const errorMessage = error?.toString() || 'Unknown error';
        console.error('Error opening spreadsheet:', errorMessage);
        let detailedError = `\u30B9\u30D7\u30EC\u30C3\u30C9\u30B7\u30FC\u30C8\u3092\u958B\u3051\u307E\u305B\u3093\u3067\u3057\u305F\u3002
`;
        detailedError += `\u30A8\u30E9\u30FC: ${errorMessage}

`;
        detailedError += `\u78BA\u8A8D\u4E8B\u9805:
`;
        detailedError += `1. \u30B9\u30D7\u30EC\u30C3\u30C9\u30B7\u30FC\u30C8ID\u304C\u6B63\u3057\u3044\u304B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044
`;
        detailedError += `2. \u30B9\u30D7\u30EC\u30C3\u30C9\u30B7\u30FC\u30C8\u304C\u5B58\u5728\u3059\u308B\u304B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044
`;
        detailedError += `3. \u30C7\u30D7\u30ED\u30A4\u6642\u306E\u5B9F\u884C\u30E6\u30FC\u30B6\u30FC\u304C\u30B9\u30D7\u30EC\u30C3\u30C9\u30B7\u30FC\u30C8\u306B\u30A2\u30AF\u30BB\u30B9\u3067\u304D\u308B\u304B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044
`;
        detailedError += `4. \u30B9\u30D7\u30EC\u30C3\u30C9\u30B7\u30FC\u30C8\u306E\u5171\u6709\u8A2D\u5B9A\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044`;
        throw new Error(detailedError);
      }
    }
    /**
     * 指定した名前のシートを取得し、存在しなければ作成する。
     * 必要なヘッダー行も保証する。
     */
    static getOrCreateSheet(sheetName, headers, spreadsheet) {
      const book = spreadsheet || this.openSpreadsheet();
      let sheet = book.getSheetByName(sheetName);
      if (!sheet) {
        sheet = book.insertSheet(sheetName);
      }
      if (sheet.getMaxColumns() < headers.length) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
      }
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      const currentHeaders = headerRange.getValues()[0];
      let needsUpdate = currentHeaders.length === 0;
      if (!needsUpdate) {
        needsUpdate = headers.some((header, index) => currentHeaders[index] !== header);
      }
      if (needsUpdate) {
        headerRange.setValues([headers]);
      }
      return sheet;
    }
    /**
     * デバッグ用: スプレッドシートへのアクセステスト
     */
    static testAccess() {
      try {
        const spreadsheetId = Config.getSpreadsheetId();
        const spreadsheet = this.openSpreadsheet();
        const name = spreadsheet.getName();
        return `Success! Spreadsheet ID: ${spreadsheetId}, Name: ${name}`;
      } catch (error) {
        return `Error: ${error.toString()}`;
      }
    }
  };

  // src/utils/index.ts
  function safeJsonParse(value, fallback) {
    if (!value || value.trim() === '') {
      return fallback;
    }
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  function slugifyTag(name) {
    if (!name) {
      return '';
    }
    const normalized = name.trim().toLowerCase().normalize('NFKC');
    const slug = normalized.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');
    if (slug) {
      return slug;
    }
    return normalized.replace(/\s+/g, '-');
  }

  // src/config/categoryFormConfig.ts
  var CATEGORY_FORM_CONFIGS = [
    {
      key: 'article',
      label: '\u6C17\u306B\u306A\u308B\u8A18\u4E8B',
      icon: '\u{1F4F0}',
      description:
        '\u6C17\u306B\u306A\u308B\u8A18\u4E8B\u3084\u8CC7\u6599\u3092\u5171\u6709\u3002\u6982\u8981\u3092\u6DFB\u3048\u3066\u30B9\u30E0\u30FC\u30BA\u306B\u53C2\u7167\u3067\u304D\u308B\u3088\u3046\u306B\u3057\u307E\u3059\u3002',
      metadataFields: [
        {
          key: 'summary',
          label: '\u8981\u7D04',
          type: 'textarea',
          placeholder:
            '\u3053\u306E\u8A18\u4E8B\u306E\u8981\u70B9\u3084\u6C17\u3065\u304D\u3092\u7C21\u6F54\u306B\u307E\u3068\u3081\u307E\u3057\u3087\u3046\u3002',
        },
        {
          key: 'sourceType',
          label: '\u60C5\u5831\u7A2E\u5225',
          type: 'select',
          options: [
            { label: 'Blog / Note', value: 'blog' },
            { label: 'Docs / Spec', value: 'document' },
            { label: 'Video / Talk', value: 'video' },
            { label: '\u305D\u306E\u4ED6', value: 'other' },
          ],
          defaultValue: 'blog',
        },
      ],
      defaultStatus: 'open',
    },
    {
      key: 'question',
      label: '\u76F8\u8AC7\u30FB\u8CEA\u554F',
      icon: '\u2753',
      description:
        '\u8AB2\u984C\u611F\u3084\u671F\u9650\u3092\u660E\u8A18\u3057\u3066\u30C1\u30FC\u30E0\u306B\u76F8\u8AC7\u3057\u307E\u3059\u3002',
      metadataFields: [
        {
          key: 'currentIssue',
          label: '\u73FE\u72B6\u8AB2\u984C',
          type: 'textarea',
          required: true,
          placeholder:
            '\u56F0\u3063\u3066\u3044\u308B\u70B9\u3084\u80CC\u666F\u3092\u5171\u6709\u3057\u3066\u304F\u3060\u3055\u3044\u3002',
        },
        {
          key: 'desiredResolutionDate',
          label: '\u89E3\u6C7A\u5E0C\u671B\u65E5',
          type: 'date',
          helperText:
            '\u76EE\u5B89\u306E\u671F\u9650\u304C\u3042\u308C\u3070\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002',
        },
      ],
      statusOptions: [
        { label: '\u672A\u89E3\u6C7A', value: 'open' },
        { label: '\u5BFE\u5FDC\u4E2D', value: 'in-progress' },
        { label: '\u89E3\u6C7A', value: 'resolved' },
      ],
      defaultStatus: 'open',
    },
    {
      key: 'recruitment',
      label: '\u4EF2\u9593\u52DF\u96C6',
      icon: '\u{1F91D}',
      description:
        '\u4E00\u7DD2\u306B\u9032\u3081\u308B\u30E1\u30F3\u30D0\u30FC\u3092\u52DF\u308B\u6295\u7A3F\u3067\u3059\u3002',
      metadataFields: [
        {
          key: 'projectOverview',
          label: '\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u6982\u8981',
          type: 'textarea',
          required: true,
          placeholder:
            '\u4F55\u3092\u5B9F\u73FE\u3057\u305F\u3044\u306E\u304B\u3001\u53D6\u308A\u7D44\u307F\u5185\u5BB9\u3092\u4F1D\u3048\u307E\u3057\u3087\u3046\u3002',
        },
        {
          key: 'roles',
          label: '\u52DF\u96C6\u30ED\u30FC\u30EB',
          type: 'text',
          placeholder:
            '\u4F8B: \u30C7\u30B6\u30A4\u30CA\u30FC / \u30A8\u30F3\u30B8\u30CB\u30A2 / PM \u306A\u3069',
        },
        {
          key: 'contactChannel',
          label: '\u9023\u7D61\u65B9\u6CD5',
          type: 'text',
          placeholder:
            'Slack #channel \u3084\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306A\u3069',
        },
      ],
      statusOptions: [
        { label: '\u52DF\u96C6\u4E2D', value: 'open' },
        { label: '\u30DE\u30C3\u30C1\u30F3\u30B0\u4E2D', value: 'matching' },
        { label: '\u7D42\u4E86', value: 'closed' },
      ],
      defaultStatus: 'open',
    },
    {
      key: 'showcase',
      label: '\u6210\u679C\u7269\u7D39\u4ECB',
      icon: '\u{1F381}',
      description:
        '\u6210\u679C\u7269\u3084\u691C\u8A3C\u7D50\u679C\u3092\u3001\u80CC\u666F\u301C\u52B9\u679C\u307E\u3067\u542B\u3081\u3066\u5171\u6709\u3057\u307E\u3059\u3002',
      metadataFields: [
        {
          key: 'backgroundPurpose',
          label: '\u80CC\u666F\u30FB\u76EE\u7684',
          type: 'textarea',
          placeholder:
            '\u306A\u305C\u53D6\u308A\u7D44\u3093\u3060\u306E\u304B\uFF08\u8AB2\u984C/\u72D9\u3044\uFF09\u3092\u8A18\u8F09\u3057\u3066\u304F\u3060\u3055\u3044\u3002',
        },
        {
          key: 'implementation',
          label: '\u5B9F\u65BD\u5185\u5BB9',
          type: 'textarea',
          placeholder:
            '\u3069\u306E\u3088\u3046\u306B\u9032\u3081\u305F\u304B\uFF08\u624B\u9806/\u5DE5\u592B/\u4F7F\u7528\u30C4\u30FC\u30EB\u306A\u3069\uFF09\u3092\u8A18\u8F09\u3057\u3066\u304F\u3060\u3055\u3044\u3002',
        },
        {
          key: 'resultEffect',
          label: '\u7D50\u679C\u30FB\u52B9\u679C',
          type: 'textarea',
          placeholder:
            '\u5F97\u3089\u308C\u305F\u7D50\u679C\u3001\u6570\u5024/\u5B9A\u6027\u7684\u306A\u52B9\u679C\u3092\u8A18\u8F09\u3057\u3066\u304F\u3060\u3055\u3044\u3002',
        },
        {
          key: 'investmentCost',
          label: '\u6295\u8CC7\u30B3\u30B9\u30C8',
          type: 'text',
          placeholder: '\u4F8B: \u691C\u8A3C 3h / API\u8CBB\u7528 100\u5186',
        },
        {
          key: 'returnEvaluation',
          label: '\u30EA\u30BF\u30FC\u30F3\u8A55\u4FA1',
          type: 'select',
          options: [
            { label: '\u25CE \u30B3\u30B9\u30D1\u826F\u597D', value: 'excellent' },
            { label: '\u25EF \u4FA1\u5024\u3042\u308A', value: 'good' },
            { label: '\u25B3 \u8981\u6539\u5584', value: 'needs_improvement' },
            { label: '\u2715 \u672A\u9054', value: 'failed' },
          ],
        },
        {
          key: 'reusability',
          label: '\u4ED6\u6848\u4EF6\u3078\u306E\u5C55\u958B\u53EF\u80FD\u6027',
          type: 'textarea',
          placeholder:
            '\u518D\u5229\u7528\u3067\u304D\u305D\u3046\u306A\u7BC4\u56F2\u30FB\u6761\u4EF6\u30FB\u6CE8\u610F\u70B9\u306A\u3069\u3092\u8A18\u8F09\u3057\u3066\u304F\u3060\u3055\u3044\u3002',
        },
        {
          key: 'insightsNextStep',
          label: '\u6C17\u3065\u304D\u30FB\u6B21\u306E\u4E00\u6B69',
          type: 'textarea',
          placeholder:
            '\u5B66\u3073\u3001\u6B21\u306B\u8A66\u3057\u305F\u3044\u3053\u3068\u30FB\u6539\u5584\u70B9\u3092\u8A18\u8F09\u3057\u3066\u304F\u3060\u3055\u3044\u3002',
        },
      ],
      defaultStatus: 'published',
    },
  ];

  // src/services/KnowledgeService.ts
  var KNOWLEDGE_SHEET_NAMES = {
    POSTS: 'Posts',
    TAGS: 'Tags',
    POST_TAGS: 'PostTags',
    COMMENTS: 'Comments',
    LIKES: 'Likes',
    COMMENT_REACTIONS: 'CommentReactions',
  };
  var KNOWLEDGE_SHEET_HEADERS = {
    POSTS: [
      'id',
      'category',
      'title',
      'content',
      'tagsCache',
      'postedBy',
      'postedAt',
      'updatedAt',
      'likesCount',
      'thumbnailUrl',
      'status',
      'metadataJson',
      'throwed',
    ],
    TAGS: ['id', 'name', 'slug', 'color', 'aliases', 'createdAt'],
    POST_TAGS: ['postId', 'tagId', 'createdAt'],
    COMMENTS: ['id', 'postId', 'author', 'content', 'postedAt'],
    LIKES: ['clientId', 'postId', 'likedAt'],
    COMMENT_REACTIONS: ['commentId', 'emoji', 'clientId', 'reactedAt'],
  };
  var CACHE_KEY_LIST = 'knowledge_list_cache';
  var CACHE_DURATION = 21600;
  var DEFAULT_CATEGORY = 'article';
  var DEFAULT_STATUS = 'open';
  var KnowledgeService = class {
    /**
     * キャッシュをクリアするヘルパーメソッド
     */
    static clearCache() {
      try {
        CacheService.getScriptCache().remove(CACHE_KEY_LIST);
        console.log('Cache cleared');
      } catch (e) {
        console.error('Failed to clear cache', e);
      }
    }
    static buildReactionsByComment(sheet) {
      const rows = this.getSheetValues(sheet);
      const aggregated = /* @__PURE__ */ new Map();
      rows.forEach(row => {
        const commentId = Number(row[0]);
        const emoji = row[1] || '';
        const clientId = row[2] || '';
        if (!commentId || Number.isNaN(commentId) || !emoji) {
          return;
        }
        const forComment = aggregated.get(commentId) || /* @__PURE__ */ new Map();
        const entry = forComment.get(emoji) || { count: 0, reactors: /* @__PURE__ */ new Set() };
        entry.count += 1;
        if (clientId) {
          entry.reactors.add(clientId);
        }
        forComment.set(emoji, entry);
        aggregated.set(commentId, forComment);
      });
      const reactionsByComment = /* @__PURE__ */ new Map();
      aggregated.forEach((emojiMap, commentId) => {
        const reactions = Array.from(emojiMap.entries()).map(([emoji, info]) => ({
          emoji,
          count: info.count,
          reactors: Array.from(info.reactors),
        }));
        reactionsByComment.set(commentId, reactions);
      });
      return reactionsByComment;
    }
    static getSheets() {
      const spreadsheet = SheetService.openSpreadsheet();
      return {
        spreadsheet,
        posts: SheetService.getOrCreateSheet(
          KNOWLEDGE_SHEET_NAMES.POSTS,
          KNOWLEDGE_SHEET_HEADERS.POSTS,
          spreadsheet,
        ),
        tags: SheetService.getOrCreateSheet(
          KNOWLEDGE_SHEET_NAMES.TAGS,
          KNOWLEDGE_SHEET_HEADERS.TAGS,
          spreadsheet,
        ),
        postTags: SheetService.getOrCreateSheet(
          KNOWLEDGE_SHEET_NAMES.POST_TAGS,
          KNOWLEDGE_SHEET_HEADERS.POST_TAGS,
          spreadsheet,
        ),
        comments: SheetService.getOrCreateSheet(
          KNOWLEDGE_SHEET_NAMES.COMMENTS,
          KNOWLEDGE_SHEET_HEADERS.COMMENTS,
          spreadsheet,
        ),
        likes: SheetService.getOrCreateSheet(
          KNOWLEDGE_SHEET_NAMES.LIKES,
          KNOWLEDGE_SHEET_HEADERS.LIKES,
          spreadsheet,
        ),
        commentReactions: SheetService.getOrCreateSheet(
          KNOWLEDGE_SHEET_NAMES.COMMENT_REACTIONS,
          KNOWLEDGE_SHEET_HEADERS.COMMENT_REACTIONS,
          spreadsheet,
        ),
      };
    }
    static getSheetValues(sheet) {
      const lastRow = sheet.getLastRow();
      const lastColumn = sheet.getLastColumn();
      if (lastRow < 2 || lastColumn === 0) {
        return [];
      }
      return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
    }
    static parseDate(value) {
      if (value instanceof Date && !isNaN(value.getTime())) {
        return value;
      }
      if (typeof value === 'string' && value) {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      return /* @__PURE__ */ new Date();
    }
    static parsePostRows(rows) {
      return rows
        .map(row => {
          if (!row || row.length === 0) {
            return null;
          }
          const id = Number(row[0]);
          if (!id || Number.isNaN(id)) {
            return null;
          }
          const category = row[1] || DEFAULT_CATEGORY;
          const title = row[2] || '';
          const content = row[3] || '';
          const tagsCache = safeJsonParse(row[4], []);
          const postedBy = row[5] || '\u533F\u540D';
          const postedAt = this.parseDate(row[6]);
          const updatedAt = this.parseDate(row[7]);
          const likesCount = Number(row[8]) || 0;
          const thumbnailUrl = row[9] || '';
          const status = row[10] || DEFAULT_STATUS;
          const metadata = safeJsonParse(row[11], {});
          const throwedRaw = row[12];
          const throwed =
            throwedRaw === true ||
            throwedRaw === 'TRUE' ||
            throwedRaw === 'true' ||
            throwedRaw === '1';
          return {
            id,
            category,
            title,
            content,
            tagsCache,
            postedBy,
            postedAt,
            updatedAt,
            likesCount,
            thumbnailUrl,
            status,
            metadata,
            throwed,
          };
        })
        .filter(row => row !== null);
    }
    static loadTagRecords(sheet) {
      const rows = this.getSheetValues(sheet);
      const tags = [];
      rows.forEach(row => {
        const id = Number(row[0]);
        if (!id || Number.isNaN(id)) {
          return;
        }
        const name = row[1] || '';
        if (!name) {
          return;
        }
        const slug = row[2] || slugifyTag(name);
        const color = row[3] || void 0;
        const aliases = safeJsonParse(row[4], []);
        tags.push({
          id,
          name,
          slug,
          color,
          aliases,
        });
      });
      return tags;
    }
    static buildTagMap(records) {
      const map = /* @__PURE__ */ new Map();
      records.forEach(tag => {
        map.set(tag.id, tag);
      });
      return map;
    }
    static buildTagsByPost(sheet, tagMap) {
      const rows = this.getSheetValues(sheet);
      const tagsByPost = /* @__PURE__ */ new Map();
      rows.forEach(row => {
        const postId = Number(row[0]);
        const tagId = Number(row[1]);
        if (!postId || !tagId || Number.isNaN(postId) || Number.isNaN(tagId)) {
          return;
        }
        const tag = tagMap.get(tagId);
        if (!tag) {
          return;
        }
        const current = tagsByPost.get(postId) || [];
        current.push(tag.name);
        tagsByPost.set(postId, current);
      });
      return tagsByPost;
    }
    static buildCommentsByPost(sheet, reactionsByComment) {
      const rows = this.getSheetValues(sheet);
      const comments = /* @__PURE__ */ new Map();
      rows.forEach(row => {
        const id = Number(row[0]);
        const postId = Number(row[1]);
        if (!postId || Number.isNaN(postId)) {
          return;
        }
        const author = row[2] || '\u533F\u540D';
        const content = row[3] || '';
        const postedAt = this.parseDate(row[4]);
        const comment = {
          id: Number.isNaN(id) ? void 0 : id,
          text: content,
          author,
          postedAt,
          reactions: reactionsByComment.get(id) || [],
        };
        const current = comments.get(postId) || [];
        current.push(comment);
        comments.set(postId, current);
      });
      return comments;
    }
    static buildKnowledgeObject(post, tagNames, comments) {
      const metadata = post.metadata || {};
      const primaryUrl =
        metadata.url || metadata.primaryUrl || metadata.demoUrl || metadata.referenceUrl || '';
      const tags = tagNames.length > 0 ? tagNames : post.tagsCache;
      return {
        id: post.id,
        title: post.title,
        url: primaryUrl,
        comment: post.content || '',
        tags,
        postedAt: new Date(post.postedAt),
        postedBy: post.postedBy,
        comments: comments.map(comment => ({
          ...comment,
          postedAt: new Date(comment.postedAt),
        })),
        thumbnailUrl: post.thumbnailUrl,
        likes: post.likesCount,
        category: post.category,
        status: post.status,
        metadata,
        throwed: post.throwed,
      };
    }
    static getNextId(sheet, columnIndex = 1) {
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return 1;
      }
      const values = sheet
        .getRange(2, columnIndex, lastRow - 1, 1)
        .getValues()
        .map(row => Number(row[0]))
        .filter(value => !Number.isNaN(value));
      const max = values.length > 0 ? Math.max(...values) : 0;
      return max + 1;
    }
    static findRowById(sheet, id) {
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return null;
      }
      const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < values.length; i++) {
        const cellValue = Number(values[i][0]);
        if (!Number.isNaN(cellValue) && cellValue === id) {
          return i + 2;
        }
      }
      return null;
    }
    static normalizeTagInput(tags) {
      if (!tags) {
        return [];
      }
      if (Array.isArray(tags)) {
        return tags
          .map(tag => tag.trim())
          .filter((tag, index, arr) => tag && arr.indexOf(tag) === index);
      }
      return tags
        .split(',')
        .map(tag => tag.trim())
        .filter((tag, index, arr) => tag && arr.indexOf(tag) === index);
    }
    static getOrCreateTagIds(tagNames, sheets) {
      if (tagNames.length === 0) {
        return { ids: [], names: [] };
      }
      const tagRecords = this.loadTagRecords(sheets.tags);
      const existingBySlug = /* @__PURE__ */ new Map();
      tagRecords.forEach(tag => existingBySlug.set(tag.slug, tag));
      const ids = [];
      const normalizedNames = [];
      tagNames.forEach(tagName => {
        const slug = slugifyTag(tagName);
        if (!slug) {
          return;
        }
        const existing = existingBySlug.get(slug);
        if (existing) {
          ids.push(existing.id);
          normalizedNames.push(existing.name);
        } else {
          const newId = this.getNextId(sheets.tags);
          const now = /* @__PURE__ */ new Date();
          sheets.tags.appendRow([newId, tagName, slug, '', JSON.stringify([]), now]);
          const record = {
            id: newId,
            name: tagName,
            slug,
            aliases: [],
          };
          existingBySlug.set(slug, record);
          ids.push(newId);
          normalizedNames.push(tagName);
        }
      });
      return { ids, names: normalizedNames };
    }
    static replacePostTags(postId, tagIds, sheet) {
      const lastRow = sheet.getLastRow();
      if (lastRow >= 2) {
        const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (let i = values.length - 1; i >= 0; i--) {
          const cellValue = Number(values[i][0]);
          if (!Number.isNaN(cellValue) && cellValue === postId) {
            sheet.deleteRow(i + 2);
          }
        }
      }
      tagIds.forEach(tagId => {
        sheet.appendRow([postId, tagId, /* @__PURE__ */ new Date()]);
      });
    }
    static assembleKnowledgeList() {
      const sheets = this.getSheets();
      const posts = this.parsePostRows(this.getSheetValues(sheets.posts));
      const tagRecords = this.loadTagRecords(sheets.tags);
      const tagMap = this.buildTagMap(tagRecords);
      const tagsByPost = this.buildTagsByPost(sheets.postTags, tagMap);
      const reactionsByComment = this.buildReactionsByComment(sheets.commentReactions);
      const commentsByPost = this.buildCommentsByPost(sheets.comments, reactionsByComment);
      return posts.map(post =>
        this.buildKnowledgeObject(
          post,
          tagsByPost.get(post.id) || [],
          commentsByPost.get(post.id) || [],
        ),
      );
    }
    static applyFilters(list, filters) {
      if (!filters) {
        return list;
      }
      let result = list.slice();
      if (filters.searchWord) {
        const searchLower = filters.searchWord.toLowerCase();
        result = result.filter(
          item =>
            (item.title && item.title.toLowerCase().includes(searchLower)) ||
            (item.comment && item.comment.toLowerCase().includes(searchLower)) ||
            (item.url && item.url.toLowerCase().includes(searchLower)),
        );
      }
      if (filters.tags && filters.tags.length > 0) {
        result = result.filter(item => filters.tags.some(tag => item.tags?.includes(tag)));
      }
      return result;
    }
    /**
     * ナレッジ一覧を取得する
     */
    static getList(filters) {
      try {
        const useCache =
          !filters || (!filters.searchWord && (!filters.tags || filters.tags.length === 0));
        if (useCache) {
          try {
            const cache = CacheService.getScriptCache();
            const cachedData = cache.get(CACHE_KEY_LIST);
            if (cachedData) {
              return JSON.parse(cachedData);
            }
          } catch (e) {
            console.error('Failed to get cache', e);
          }
        }
        const list = this.assembleKnowledgeList();
        if (useCache && list.length > 0) {
          try {
            CacheService.getScriptCache().put(CACHE_KEY_LIST, JSON.stringify(list), CACHE_DURATION);
          } catch (e) {
            console.error('Failed to cache data', e);
          }
        }
        return this.applyFilters(list, filters);
      } catch (error) {
        console.error('Error in getKnowledgeList:', error);
        console.error('Error details:', error.toString());
        console.error('Error stack:', error.stack);
        return [];
      }
    }
    /**
     * ナレッジの詳細を取得する
     */
    static getDetail(id) {
      if (!id) {
        return null;
      }
      const list = this.getList();
      const item = list.find(knowledge => knowledge.id === id);
      return item || null;
    }
    static getReferenceData() {
      const sheets = this.getSheets();
      const tags = this.loadTagRecords(sheets.tags);
      return {
        tags,
        categories: CATEGORY_FORM_CONFIGS,
      };
    }
    /**
     * ナレッジを追加する
     */
    static add(knowledge) {
      try {
        const sheets = this.getSheets();
        const tagNames = this.normalizeTagInput(knowledge.tags);
        const { ids: tagIds, names: normalizedTagNames } = this.getOrCreateTagIds(tagNames, sheets);
        const now = /* @__PURE__ */ new Date();
        const newId = this.getNextId(sheets.posts);
        const category = knowledge.category || DEFAULT_CATEGORY;
        const metadata = {
          url: knowledge.url || '',
          ...(knowledge.metadata || {}),
        };
        const throwed = knowledge.throwed === true;
        sheets.posts.appendRow([
          newId,
          category,
          knowledge.title || '',
          knowledge.comment || '',
          JSON.stringify(normalizedTagNames),
          knowledge.postedBy || '\u533F\u540D',
          now,
          now,
          0,
          knowledge.thumbnailUrl || '',
          knowledge.status || DEFAULT_STATUS,
          JSON.stringify(metadata),
          throwed,
        ]);
        if (tagIds.length > 0) {
          tagIds.forEach(tagId => {
            sheets.postTags.appendRow([newId, tagId, now]);
          });
        }
        this.clearCache();
        return { success: true, id: newId };
      } catch (error) {
        console.error('Error adding knowledge:', error);
        return { success: false, error: error.toString() };
      }
    }
    /**
     * ナレッジを更新する
     */
    static update(knowledgeId, knowledge) {
      try {
        const sheets = this.getSheets();
        const rowNumber = this.findRowById(sheets.posts, knowledgeId);
        if (!rowNumber) {
          return {
            success: false,
            error: '\u30CA\u30EC\u30C3\u30B8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093',
          };
        }
        const tagNames = this.normalizeTagInput(knowledge.tags);
        const { ids: tagIds, names: normalizedTagNames } = this.getOrCreateTagIds(tagNames, sheets);
        const metadata = {
          url: knowledge.url || '',
          ...(knowledge.metadata || {}),
        };
        const rowValues = sheets.posts
          .getRange(rowNumber, 1, 1, KNOWLEDGE_SHEET_HEADERS.POSTS.length)
          .getValues()[0];
        const existingPostedAt = rowValues[6] || /* @__PURE__ */ new Date();
        const existingLikes = Number(rowValues[8]) || 0;
        const existingThrowed =
          rowValues[12] === true ||
          rowValues[12] === 'TRUE' ||
          rowValues[12] === 'true' ||
          rowValues[12] === '1';
        sheets.posts
          .getRange(rowNumber, 2, 1, KNOWLEDGE_SHEET_HEADERS.POSTS.length - 1)
          .setValues([
            [
              knowledge.category || rowValues[1] || DEFAULT_CATEGORY,
              knowledge.title || '',
              knowledge.comment || '',
              JSON.stringify(normalizedTagNames),
              knowledge.postedBy || '\u533F\u540D',
              existingPostedAt,
              /* @__PURE__ */ new Date(),
              existingLikes,
              knowledge.thumbnailUrl || '',
              knowledge.status || rowValues[10] || DEFAULT_STATUS,
              JSON.stringify(metadata),
              knowledge.throwed === true ? true : existingThrowed,
            ],
          ]);
        this.replacePostTags(knowledgeId, tagIds, sheets.postTags);
        this.clearCache();
        return { success: true, id: knowledgeId };
      } catch (error) {
        console.error('Error updating knowledge:', error);
        return { success: false, error: error.toString() };
      }
    }
    /**
     * コメントを追加する
     */
    static addComment(knowledgeId, comment, author) {
      try {
        const sheets = this.getSheets();
        const rowNumber = this.findRowById(sheets.posts, knowledgeId);
        if (!rowNumber) {
          return false;
        }
        const newId = this.getNextId(sheets.comments);
        const now = /* @__PURE__ */ new Date();
        sheets.comments.appendRow([newId, knowledgeId, author || '\u533F\u540D', comment, now]);
        sheets.posts.getRange(rowNumber, 8).setValue(now);
        this.clearCache();
        return true;
      } catch (error) {
        console.error('Error adding comment:', error);
        return false;
      }
    }
    /**
     * コメントを削除する
     */
    static deleteComment(commentId, knowledgeId) {
      try {
        const sheets = this.getSheets();
        const commentRow = this.findRowById(sheets.comments, commentId);
        if (!commentRow) {
          return false;
        }
        sheets.comments.deleteRow(commentRow);
        const postRow = this.findRowById(sheets.posts, knowledgeId);
        if (postRow) {
          sheets.posts.getRange(postRow, 8).setValue(/* @__PURE__ */ new Date());
        }
        this.clearCache();
        return true;
      } catch (error) {
        console.error('Error deleting comment:', error);
        return false;
      }
    }
    /**
     * いいねを追加する
     */
    static addLike(knowledgeId, clientId) {
      try {
        const sheets = this.getSheets();
        const rowNumber = this.findRowById(sheets.posts, knowledgeId);
        if (!rowNumber) {
          throw new Error(
            '\u30CA\u30EC\u30C3\u30B8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093',
          );
        }
        let alreadyLiked = false;
        if (clientId) {
          const likeRows = this.getSheetValues(sheets.likes);
          alreadyLiked = likeRows.some(
            row => row[0] === clientId && Number(row[1]) === Number(knowledgeId),
          );
        }
        if (!alreadyLiked) {
          sheets.likes.appendRow([
            clientId || `anonymous-${Utilities.getUuid()}`,
            knowledgeId,
            /* @__PURE__ */ new Date(),
          ]);
          const likesCell = sheets.posts.getRange(rowNumber, 9);
          const currentLikes = Number(likesCell.getValue()) || 0;
          likesCell.setValue(currentLikes + 1);
        }
        this.clearCache();
        return Number(sheets.posts.getRange(rowNumber, 9).getValue()) || 0;
      } catch (error) {
        console.error('Error adding like:', error);
        return 0;
      }
    }
    static buildCommentReactionsForId(commentId, sheet) {
      const reactionsByComment = this.buildReactionsByComment(sheet);
      return reactionsByComment.get(commentId) || [];
    }
    static toggleCommentReaction(commentId, emoji, clientId) {
      try {
        const normalizedEmoji = (emoji || '').trim();
        if (!commentId || Number.isNaN(Number(commentId))) {
          return {
            success: false,
            error: '\u30B3\u30E1\u30F3\u30C8ID\u304C\u4E0D\u6B63\u3067\u3059',
          };
        }
        if (!normalizedEmoji) {
          return { success: false, error: '\u7D75\u6587\u5B57\u304C\u4E0D\u6B63\u3067\u3059' };
        }
        const sheets = this.getSheets();
        const commentRow = this.findRowById(sheets.comments, Number(commentId));
        if (!commentRow) {
          return {
            success: false,
            error: '\u30B3\u30E1\u30F3\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093',
          };
        }
        const resolvedClientId = clientId || `anonymous-${Utilities.getUuid()}`;
        const rows = this.getSheetValues(sheets.commentReactions);
        const existingIndex = rows.findIndex(
          row =>
            Number(row[0]) === Number(commentId) &&
            row[1] === normalizedEmoji &&
            row[2] === resolvedClientId,
        );
        if (existingIndex >= 0) {
          sheets.commentReactions.deleteRow(existingIndex + 2);
        } else {
          sheets.commentReactions.appendRow([
            commentId,
            normalizedEmoji,
            resolvedClientId,
            /* @__PURE__ */ new Date(),
          ]);
        }
        const reactions = this.buildCommentReactionsForId(commentId, sheets.commentReactions);
        this.clearCache();
        return { success: true, reactions };
      } catch (error) {
        console.error('Error toggling comment reaction:', error);
        return { success: false, error: error.toString() };
      }
    }
  };

  // src/Code.ts
  function doGet(e) {
    const imgId = e?.parameter && typeof e.parameter.img === 'string' ? e.parameter.img.trim() : '';
    if (imgId) {
      return serveKnowledgeImage(imgId);
    }
    const template = HtmlService.createTemplateFromFile('index');
    template.spreadsheetId = Config.getSpreadsheetId();
    let initialId = null;
    const singleIdParam = e.parameter && typeof e.parameter.id === 'string' ? e.parameter.id : null;
    const multiIdParam =
      e.parameters &&
      e.parameters.id &&
      Array.isArray(e.parameters.id) &&
      e.parameters.id.length > 0
        ? e.parameters.id[0]
        : null;
    const candidateId = singleIdParam || multiIdParam;
    if (candidateId) {
      const trimmedId = candidateId.trim();
      if (/^\d+$/.test(trimmedId)) {
        initialId = parseInt(trimmedId, 10);
      } else {
        console.log(`Ignoring non-numeric id parameter: ${trimmedId}`);
      }
    }
    const initialView = e.parameter.view === 'panel' ? 'panel' : 'modal';
    let appUrl = '';
    try {
      appUrl = ScriptApp.getService().getUrl();
    } catch (error) {
      console.error('Failed to get app URL', error);
    }
    const initialData = KnowledgeService.getList();
    const referenceData = KnowledgeService.getReferenceData();
    const serverData = {
      initialData,
      referenceData,
      initialId,
      initialView,
      appUrl,
    };
    template.serverData = JSON.stringify(serverData).replace(/</g, '\\u003c');
    return template
      .evaluate()
      .setTitle('AI Knowledge Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  function serveKnowledgeImage(fileId) {
    try {
      const file = DriveApp.getFileById(String(fileId).trim());
      const blob = file.getBlob();
      const contentType = blob.getContentType() || 'application/octet-stream';
      return ContentService.createTextOutput(blob.getDataAsString()).setMimeType(contentType);
    } catch (error) {
      console.error('Failed to serve knowledge image:', error);
      return ContentService.createTextOutput('Not Found').setMimeType(ContentService.MimeType.TEXT);
    }
  }
  function getKnowledgeList(filters) {
    const list = KnowledgeService.getList(filters);
    return JSON.stringify(list);
  }
  function getKnowledgeDetail(id) {
    const detail = KnowledgeService.getDetail(id);
    return JSON.stringify(detail);
  }
  function getReferenceData() {
    const reference = KnowledgeService.getReferenceData();
    return JSON.stringify(reference);
  }
  function addKnowledge(knowledge) {
    const result = KnowledgeService.add(knowledge);
    return JSON.stringify(result);
  }
  function updateKnowledge(knowledgeId, knowledge) {
    const result = KnowledgeService.update(knowledgeId, knowledge);
    return JSON.stringify(result);
  }
  var UPLOAD_FOLDER_ID_PROP = 'UPLOAD_FOLDER_ID';
  var DEFAULT_UPLOAD_FOLDER_NAME = 'AI Knowledge Dashboard Uploads';
  function getOrCreateUploadFolderId() {
    const props = PropertiesService.getScriptProperties();
    const existing = (props.getProperty(UPLOAD_FOLDER_ID_PROP) || '').trim();
    if (existing) {
      try {
        DriveApp.getFolderById(existing).getId();
      } catch (error) {
        throw new Error(
          `UPLOAD_FOLDER_ID \u306E\u30D5\u30A9\u30EB\u30C0\u306B\u30A2\u30AF\u30BB\u30B9\u3067\u304D\u307E\u305B\u3093\u3002\u30D7\u30ED\u30D1\u30C6\u30A3\u3092\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002 folderId=${existing} error=${error?.message || error}`,
        );
      }
      return existing;
    }
    const folder = DriveApp.createFolder(DEFAULT_UPLOAD_FOLDER_NAME);
    props.setProperty(UPLOAD_FOLDER_ID_PROP, folder.getId());
    return folder.getId();
  }
  function ensureUploadFolder(folderName) {
    const name = (folderName || DEFAULT_UPLOAD_FOLDER_NAME).trim() || DEFAULT_UPLOAD_FOLDER_NAME;
    const props = PropertiesService.getScriptProperties();
    const existing = (props.getProperty(UPLOAD_FOLDER_ID_PROP) || '').trim();
    if (existing) {
      const folder2 = DriveApp.getFolderById(existing);
      return { folderId: folder2.getId(), folderUrl: folder2.getUrl() };
    }
    const folder = DriveApp.createFolder(name);
    props.setProperty(UPLOAD_FOLDER_ID_PROP, folder.getId());
    return { folderId: folder.getId(), folderUrl: folder.getUrl() };
  }
  function getKnowledgeImageData(fileId) {
    const normalized = String(fileId || '').trim();
    if (!normalized) {
      throw new Error('fileId\u304C\u4E0D\u6B63\u3067\u3059');
    }
    const file = DriveApp.getFileById(normalized);
    const blob = file.getBlob();
    return {
      mimeType: blob.getContentType() || 'application/octet-stream',
      base64: Utilities.base64Encode(blob.getBytes()),
    };
  }
  function authorizeDrive() {
    DriveApp.getRootFolder().getId();
    return true;
  }
  function uploadKnowledgeImage(payload) {
    if (!payload || typeof payload.dataUrl !== 'string') {
      throw new Error(
        '\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u30C7\u30FC\u30BF\u304C\u4E0D\u6B63\u3067\u3059',
      );
    }
    const dataUrl = payload.dataUrl.trim();
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error('dataURL\u306E\u5F62\u5F0F\u304C\u4E0D\u6B63\u3067\u3059');
    }
    const mimeType = match[1];
    const base64 = match[2];
    if (!mimeType.startsWith('image/')) {
      throw new Error(
        '\u753B\u50CF\u30D5\u30A1\u30A4\u30EB\u306E\u307F\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3067\u304D\u307E\u3059',
      );
    }
    const approxBytes = Math.floor((base64.length * 3) / 4);
    const maxBytes = 5 * 1024 * 1024;
    if (approxBytes > maxBytes) {
      throw new Error(
        '\u753B\u50CF\u30B5\u30A4\u30BA\u304C\u5927\u304D\u3059\u304E\u307E\u3059\uFF08\u6700\u5927 5MB\uFF09',
      );
    }
    const bytes = Utilities.base64Decode(base64);
    const safeName = (payload.filename || `image-${Date.now()}.png`).replace(/[\\/:*?"<>|]/g, '_');
    const blob = Utilities.newBlob(bytes, mimeType, safeName);
    const folderId = getOrCreateUploadFolderId();
    const file = DriveApp.getFolderById(folderId).createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (error1) {
      try {
        file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (error2) {
        console.warn('Skipping setSharing due to policy/permission:', error1, error2);
      }
    }
    try {
      const appUrl = ScriptApp.getService().getUrl();
      if (appUrl) {
        return `${appUrl}?img=${file.getId()}`;
      }
    } catch (error) {
      console.warn('Failed to build appUrl, falling back to Drive URL:', error);
    }
    return `https://drive.google.com/uc?export=view&id=${file.getId()}`;
  }
  function toggleCommentReaction(commentId, emoji, clientId) {
    const result = KnowledgeService.toggleCommentReaction(commentId, emoji, clientId);
    return JSON.stringify(result);
  }
  function addComment(knowledgeId, comment, author) {
    return KnowledgeService.addComment(knowledgeId, comment, author);
  }
  function deleteComment(commentId, knowledgeId) {
    return KnowledgeService.deleteComment(commentId, knowledgeId);
  }
  function addLike(knowledgeId, clientId) {
    return KnowledgeService.addLike(knowledgeId, clientId);
  }
  function testSpreadsheetAccess() {
    return SheetService.testAccess();
  }
  function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  }
  var globalScope = globalThis;
  globalScope.doGet = doGet;
  globalScope.getKnowledgeList = getKnowledgeList;
  globalScope.getKnowledgeDetail = getKnowledgeDetail;
  globalScope.getReferenceData = getReferenceData;
  globalScope.addKnowledge = addKnowledge;
  globalScope.updateKnowledge = updateKnowledge;
  globalScope.addComment = addComment;
  globalScope.deleteComment = deleteComment;
  globalScope.addLike = addLike;
  globalScope.uploadKnowledgeImage = uploadKnowledgeImage;
  globalScope.authorizeDrive = authorizeDrive;
  globalScope.getKnowledgeImageData = getKnowledgeImageData;
  globalScope.ensureUploadFolder = ensureUploadFolder;
  globalScope.testSpreadsheetAccess = testSpreadsheetAccess;
  globalScope.include = include;
  globalScope.toggleCommentReaction = toggleCommentReaction;
})();
