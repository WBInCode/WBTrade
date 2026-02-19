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
 */
export function getTopSearches(
  limit: number = 10,
  since?: Date
): { query: string; count: number }[] {
  const results: { query: string; count: number }[] = [];

  for (const [query, entry] of searchMap.entries()) {
    if (since) {
      // Count only searches within the time period
      const sinceISO = since.toISOString();
      const recentCount = entry.searches.filter((t) => t >= sinceISO).length;
      if (recentCount > 0) {
        results.push({ query, count: recentCount });
      }
    } else {
      results.push({ query, count: entry.count });
    }
  }

  results.sort((a, b) => b.count - a.count);
  return results.slice(0, limit);
}

/**
 * Get total unique search queries tracked
 */
export function getTotalQueries(): number {
  return searchMap.size;
}
