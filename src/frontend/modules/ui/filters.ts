import {
  getSelectedCategory,
  setSelectedCategory,
  getSelectedTags,
  setSelectedTags,
  getCurrentView,
  setCurrentView,
  getAllKnowledge,
  getLikedKnowledgeIds,
  isKnowledgeLiked,
} from '../data/state';
import { renderKnowledgeGrid } from './render';

export function updateCategoryUI() {
  const selectedCategory = getSelectedCategory();
  document.querySelectorAll('.category-chip').forEach((chip) => {
    const cat = chip.getAttribute('data-category');
    if (cat) {
      chip.classList.toggle('active', cat === selectedCategory);
    }
  });
}

export function setCategory(category: string) {
  setSelectedCategory(category);
  updateCategoryUI();
  filterKnowledge();
}

export function updateViewUI() {
  const currentView = getCurrentView();
  document.querySelectorAll('.nav-item').forEach((item) => {
    const view = item.getAttribute('data-view');
    if (view) {
      item.classList.toggle('active', view === currentView);
    }
  });
}

export function setView(view: 'all' | 'favorites') {
  setCurrentView(view);
  updateViewUI();
  filterKnowledge();
}

export function updateInsights() {
  const allKnowledge = getAllKnowledge();
  const totalEl = document.getElementById('statTotalPosts');
  if (totalEl) {
    totalEl.textContent = allKnowledge.length.toString();
  }
  const favoriteEl = document.getElementById('statFavorites');
  if (favoriteEl) {
    favoriteEl.textContent = getLikedKnowledgeIds().size.toString();
  }
  const commentCount = allKnowledge.reduce((sum, item) => {
    return sum + (item.comments ? item.comments.length : 0);
  }, 0);
  const commentsEl = document.getElementById('statComments');
  if (commentsEl) {
    commentsEl.textContent = commentCount.toString();
  }
}

export function updateTagFilter(knowledgeList: any[], activeTags: string[]) {
  if (!knowledgeList || !Array.isArray(knowledgeList)) {
    return;
  }
  const tagsSet = new Set<string>();
  knowledgeList.forEach((k) => {
    if (k && k.tags && Array.isArray(k.tags)) {
      k.tags.forEach((tag: string) => {
        if (tag) {
          tagsSet.add(tag);
        }
      });
    }
  });
  const tagsFilter = document.getElementById('tagsFilter');
  if (!tagsFilter) {
    return;
  }
  const activeSet = Array.isArray(activeTags) ? activeTags : [];
  tagsFilter.innerHTML = Array.from(tagsSet)
    .map(
      (tag) =>
        `<span class="tag-chip ${activeSet.includes(tag) ? 'active' : ''}" onclick="toggleTag('${tag}')">${tag}</span>`
    )
    .join('');
}

export function toggleTag(tag: string) {
  const tags = [...getSelectedTags()];
  const index = tags.indexOf(tag);
  if (index > -1) {
    tags.splice(index, 1);
  } else {
    tags.push(tag);
  }
  setSelectedTags(tags);
  filterKnowledge();
}

export function searchKnowledge() {
  filterKnowledge();
}

export function filterKnowledge() {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const searchWord = searchInput ? searchInput.value.toLowerCase() : '';
  const allKnowledge = getAllKnowledge();
  const activeTags = getSelectedTags();
  const category = getSelectedCategory();
  const currentView = getCurrentView();
  const filteredList = allKnowledge.filter((k) => {
    const normalizedCategory = k.category || 'article';
    let matchesSearch = true;
    if (searchWord) {
      matchesSearch =
        (k.title && k.title.toLowerCase().includes(searchWord)) ||
        (k.comment && k.comment.toLowerCase().includes(searchWord)) ||
        (k.url && k.url.toLowerCase().includes(searchWord));
    }
    let matchesTags = true;
    if (activeTags.length > 0) {
      matchesTags = activeTags.some((tag) => k.tags && k.tags.includes(tag));
    }
    const matchesCategory = category === 'all' || normalizedCategory === category;
    const matchesView = currentView === 'all' ? true : isKnowledgeLiked(k.id);
    return matchesSearch && matchesTags && matchesCategory && matchesView;
  });
  renderKnowledgeGrid(filteredList);
  document.querySelectorAll('.tag-chip').forEach((chip) => {
    const tag = chip.textContent || '';
    if (tag && activeTags.includes(tag)) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}
