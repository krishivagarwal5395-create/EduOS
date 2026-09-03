// Helper to safely write to localStorage with quota error protection
export function safeSetLocalStorage<T>(key: string, data: T): { success: boolean; quotaExceeded: boolean } {
  try {
    const stringified = JSON.stringify(data);
    localStorage.setItem(key, stringified);
    return { success: true, quotaExceeded: false };
  } catch (error: any) {
    const isQuotaError =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        error.code === 22 ||
        error.code === 1014);

    console.warn(`localStorage.setItem quota error for key '${key}':`, error);

    if (isQuotaError && Array.isArray(data)) {
      // Try progressively trimming older items from the array
      let items = [...data];
      while (items.length > 1) {
        const dropCount = Math.max(1, Math.floor(items.length * 0.25));
        items = items.slice(0, items.length - dropCount);
        try {
          localStorage.setItem(key, JSON.stringify(items));
          console.info(`Saved trimmed array of ${items.length} items to localStorage after handling quota limit.`);
          return { success: true, quotaExceeded: true };
        } catch (retryError) {
          // Keep loop going until it fits or items.length <= 1
        }
      }
    }

    return { success: false, quotaExceeded: true };
  }
}

export function safeGetLocalStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (e) {
    console.error(`Failed to load '${key}' from localStorage:`, e);
    return fallback;
  }
}

/**
 * Extracts the core base title by stripping duplicate prefixes like "Duplicate of", "Copy of",
 * and trailing numbering like "(1)", "(2)", " (1)", etc.
 */
export function extractBaseTitle(rawTitle: string): string {
  if (!rawTitle) return "Untitled";
  let base = rawTitle.trim();
  // Strip prefixes like "Duplicate of ", "Copy of ", "Duplicate: ", "Copy: "
  base = base.replace(/^(duplicate\s+of\s+|copy\s+of\s+|duplicate\s*:\s*|copy\s*:\s*)+/i, '');
  // Strip trailing numbers like (1), (2), etc.
  base = base.replace(/\s*\(\s*\d+\s*\)\s*$/i, '');
  return base.trim() || rawTitle.trim();
}

/**
 * Formats a title for new or duplicated items.
 * If base title already exists in existing titles or has "Duplicate of" prefix:
 * produces "[Base Title](1)", "[Base Title](2)", etc. (e.g. Robots PPT(1))
 */
export function formatDuplicateTitle(rawTitle: string, existingTitles: string[], isExplicitDuplicate: boolean = false): string {
  const hadPrefix = /^(duplicate\s+of\s+|copy\s+of\s+|duplicate\s*:\s*|copy\s*:\s*)/i.test(rawTitle.trim());
  const base = extractBaseTitle(rawTitle);

  // Normalize list of existing titles for comparison
  const normalizedExisting = existingTitles.map(t => t.trim().toLowerCase());
  const baseLower = base.toLowerCase();

  // Check if base exists or if this is an explicit duplication / has duplicate prefix
  const baseExists = normalizedExisting.includes(baseLower);

  if (!baseExists && !hadPrefix && !isExplicitDuplicate) {
    // Brand new unique title
    return rawTitle.trim();
  }

  // Find next available index: (1), (2), (3)...
  let index = 1;
  while (true) {
    const candidateCompact = `${base}(${index})`;
    const candidateSpaced = `${base} (${index})`;
    
    const exists = normalizedExisting.includes(candidateCompact.toLowerCase()) || 
                   normalizedExisting.includes(candidateSpaced.toLowerCase());
    
    if (!exists) {
      return candidateCompact;
    }
    index++;
  }
}
