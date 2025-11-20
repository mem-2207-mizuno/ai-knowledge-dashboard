export function normalizeKnowledgeId(rawId: unknown): number | null {
  if (rawId === null || rawId === undefined) {
    return null;
  }
  if (typeof rawId === 'number') {
    return Number.isFinite(rawId) && rawId > 0 ? Math.floor(rawId) : null;
  }
  if (typeof rawId === 'string') {
    const trimmed = rawId.trim();
    if (trimmed === '') {
      return null;
    }
    const parsed = parseInt(trimmed, 10);
    return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
  }
  return null;
}
