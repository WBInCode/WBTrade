/**
 * Search Analytics Service
 * 
 * Tracks ALL product searches (authenticated + anonymous) server-side.
 * Uses in-memory Map with file persistence for survival across restarts.
 * This solves the problem where SearchHistory only records logged-in users.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface SearchEntry {
  count: number;
  lastSearched: string; // ISO date
  searches: string[]; // timestamps of individual searches (last 100)
}

const DATA_FILE = join(__dirname, '../../data/search-analytics.json');
const searchMap = new Map<string, SearchEntry>();
let saveTimer: NodeJS.Timeout | null = null;

// Load persisted data on startup
function loadFromFile(): void {
  try {
    if (existsSync(DATA_FILE)) {
      const raw = readFileSync(DATA_FILE, 'utf-8');
      const data: Record<string, SearchEntry> = JSON.parse(raw);
      for (const [query, entry] of Object.entries(data)) {
        searchMap.set(query, entry);
      }
      console.log(`📊 Search analytics loaded: ${searchMap.size} queries tracked`);
    }
  } catch (err) {
    console.error('Failed to load search analytics:', err);
  }
}

// Save to file (debounced)
function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const dir = join(__dirname, '../../data');
      if (!existsSync(dir)) {
        const { mkdirSync } = require('fs');
        mkdirSync(dir, { recursive: true });
      }
      const obj: Record<string, SearchEntry> = {};
      for (const [key, val] of searchMap.entries()) {
        obj[key] = val;
      }
      writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save search analytics:', err);
    }
  }, 5000); // save at most every 5 seconds
}

// Initialize
loadFromFile();

/**
 * Track a search query (called from product search endpoint)
 */
export function trackSearch(rawQuery: string): void {
  const query = rawQuery.trim().toLowerCase();
  if (!query || query.length < 2) return;

  const now = new Date().toISOString();
  const existing = searchMap.get(query);

  if (existing) {
    existing.count += 1;
    existing.lastSearched = now;
    existing.searches.push(now);
    // Keep only last 100 timestamps
    if (existing.searches.length > 100) {
      existing.searches = existing.searches.slice(-100);
    }
  } else {
    searchMap.set(query, {
      count: 1,
      lastSearched: now,
      searches: [now],
    });
  }

  scheduleSave();
}

/**
 * Get top searched queries
 * Filters out very short queries (< 3 chars) that are likely just typing fragments.
 * Merges prefix duplicates: if "zab" and "zabawka" both exist, only keep the longer form.
 */
export function getTopSearches(
  limit: number = 10,
  since?: Date
): { query: string; count: number }[] {
  const raw: { query: string; count: number }[] = [];

  for (const [query, entry] of searchMap.entries()) {
    // Skip very short queries (typing fragments like "za", "ab")
    if (query.length < 3) continue;

    if (since) {
      // Count only searches within the time period
      const sinceISO = since.toISOString();
      const recentCount = entry.searches.filter((t) => t >= sinceISO).length;
      if (recentCount > 0) {
        raw.push({ query, count: recentCount });
      }
    } else {
      raw.push({ query, count: entry.count });
    }
  }

  // Merge prefix duplicates: if "zab" counts 3 and "zabawka" counts 8,
  // add "zab" counts to "zabawka" (the longer, more meaningful term).
  raw.sort((a, b) => a.query.length - b.query.length); // short first
  const merged = new Map<string, number>();

  for (const item of raw) {
    // Check if this short query is a prefix of an existing longer query
    let mergedInto: string | null = null;
    for (const [existing] of merged) {
      if (existing.startsWith(item.query) && existing !== item.query) {
        merged.set(existing, (merged.get(existing) || 0) + item.count);
        mergedInto = existing;
        break;
      }
    }

    if (!mergedInto) {
      // Check if an existing shorter query is a prefix of this one
      for (const [existing, existingCount] of merged) {
        if (item.query.startsWith(existing) && existing !== item.query) {
          // Move the shorter entry's count to this longer one
          merged.delete(existing);
          merged.set(item.query, existingCount + item.count);
          mergedInto = item.query;
          break;
        }
      }
    }

    if (!mergedInto) {
      merged.set(item.query, item.count);
    }
  }

  const results = Array.from(merged.entries()).map(([query, count]) => ({ query, count }));
  results.sort((a, b) => b.count - a.count);
  return results.slice(0, limit);
}

/**
 * Get total unique search queries tracked
 */
export function getTotalQueries(): number {
  return searchMap.size;
}
