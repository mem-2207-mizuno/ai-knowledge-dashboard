import type { Knowledge, Comment } from '../../../types';

const CLIENT_ID_STORAGE_KEY = 'ai-knowledge-dashboard-client-id';
const LIKED_STORAGE_KEY = 'ai-knowledge-dashboard-liked-ids';

let allKnowledge: Knowledge[] = [];
let selectedTags: string[] = [];
let selectedCategory = 'all';
let currentView: 'all' | 'favorites' = 'all';
let clientId = '';
let likedKnowledgeIds: Set<string> = new Set();

function ensureClientId(): string {
  try {
    let stored = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (!stored) {
      stored = `client-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(CLIENT_ID_STORAGE_KEY, stored);
    }
    return stored;
  } catch (error) {
    console.warn('Failed to access localStorage for client ID:', error);
    return `client-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
}

function loadLikedKnowledgeIds(): Set<string> {
  try {
    const stored = localStorage.getItem(LIKED_STORAGE_KEY);
    if (!stored) {
      return new Set();
    }
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return new Set(parsed.map(id => id.toString()));
    }
  } catch (error) {
    console.warn('Failed to load liked IDs from storage:', error);
  }
  return new Set();
}

function saveLikedKnowledgeIds() {
  try {
    localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(Array.from(likedKnowledgeIds)));
  } catch (error) {
    console.warn('Failed to save liked IDs:', error);
  }
}

export function initClientState() {
  clientId = ensureClientId();
  likedKnowledgeIds = loadLikedKnowledgeIds();
}

export function getClientId(): string {
  if (!clientId) {
    clientId = ensureClientId();
  }
  return clientId;
}

export function getLikedKnowledgeIds(): Set<string> {
  return likedKnowledgeIds;
}

export function isKnowledgeLiked(id?: number | string | null): boolean {
  if (!id) {
    return false;
  }
  return likedKnowledgeIds.has(id.toString());
}

export function markKnowledgeLiked(id: number) {
  if (!id) {
    return;
  }
  likedKnowledgeIds.add(id.toString());
  saveLikedKnowledgeIds();
}

export function unmarkKnowledgeLiked(id: number) {
  if (!id) {
    return;
  }
  likedKnowledgeIds.delete(id.toString());
  saveLikedKnowledgeIds();
}

export function toggleKnowledgeLiked(id: number): boolean {
  if (!id) {
    return false;
  }
  if (likedKnowledgeIds.has(id.toString())) {
    likedKnowledgeIds.delete(id.toString());
    saveLikedKnowledgeIds();
    return false;
  }
  likedKnowledgeIds.add(id.toString());
  saveLikedKnowledgeIds();
  return true;
}

export function setAllKnowledge(list: Knowledge[]) {
  allKnowledge = list;
}

export function getAllKnowledge(): Knowledge[] {
  return allKnowledge;
}

export function setSelectedTags(tags: string[]) {
  selectedTags = tags;
}

export function getSelectedTags(): string[] {
  return selectedTags;
}

export function setSelectedCategory(category: string) {
  selectedCategory = category;
}

export function getSelectedCategory(): string {
  return selectedCategory;
}

export function setCurrentView(view: 'all' | 'favorites') {
  currentView = view;
}

export function getCurrentView(): 'all' | 'favorites' {
  return currentView;
}

export function findKnowledgeById(id: number): Knowledge | undefined {
  return allKnowledge.find(item => item.id == id);
}

export function appendOptimisticComment(knowledgeId: number, comment: Comment) {
  const knowledge = findKnowledgeById(knowledgeId);
  if (!knowledge) {
    return;
  }
  if (!Array.isArray(knowledge.comments)) {
    knowledge.comments = [];
  }
  knowledge.comments.push(comment);
}

export function removeOptimisticCommentFromState(knowledgeId: number, tempId: string) {
  const knowledge = findKnowledgeById(knowledgeId);
  if (!knowledge || !Array.isArray(knowledge.comments)) {
    return;
  }
  knowledge.comments = knowledge.comments.filter(comment => comment.tempId !== tempId);
}

export function removeCommentById(knowledgeId: number, commentId: number) {
  const knowledge = findKnowledgeById(knowledgeId);
  if (!knowledge || !Array.isArray(knowledge.comments)) {
    return;
  }
  knowledge.comments = knowledge.comments.filter(comment => comment.id !== commentId);
}

export function confirmOptimisticCommentInState(knowledgeId: number, tempId: string) {
  const knowledge = findKnowledgeById(knowledgeId);
  if (!knowledge || !Array.isArray(knowledge.comments)) {
    return;
  }
  const comment = knowledge.comments.find(c => c.tempId === tempId);
  if (!comment) {
    return;
  }
  comment.pending = false;
  delete comment.tempId;
  comment.postedAt = new Date();
}
