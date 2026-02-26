/**
 * Sync Progress Manager
 * 
 * Provides real-time progress tracking for BaseLinker sync operations.
 * Uses EventEmitter for SSE streaming and maintains in-memory history.
 * Also handles abort signaling for emergency sync cancellation.
 */

import { EventEmitter } from 'events';

// ============================================
// Types
// ============================================

export interface SyncProgressEvent {
  syncLogId: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'progress' | 'phase' | 'complete' | 'aborted';
  message: string;
  phase?: string;
  current?: number;
  total?: number;
  percent?: number;
  productName?: string;
  sku?: string;
}

// ============================================
// Singleton Progress Manager
// ============================================

class SyncProgressManager {
  private emitter = new EventEmitter();
  private abortedSyncs = new Set<string>();
  private history = new Map<string, SyncProgressEvent[]>();

  constructor() {
    // Allow many listeners (each SSE client = 1 listener)
    this.emitter.setMaxListeners(50);
  }

  /**
   * Send a progress event for a sync operation
   */
  sendProgress(syncLogId: string, event: Omit<SyncProgressEvent, 'syncLogId' | 'timestamp'>): void {
    const fullEvent: SyncProgressEvent = {
      ...event,
      syncLogId,
      timestamp: new Date().toISOString(),
    };

    // Store in history
    if (!this.history.has(syncLogId)) {
      this.history.set(syncLogId, []);
    }
    const events = this.history.get(syncLogId)!;
    events.push(fullEvent);
    // Keep last 1000 events per sync
    if (events.length > 1000) events.splice(0, events.length - 1000);

    // Emit to listeners (SSE clients)
    this.emitter.emit(`sync:${syncLogId}`, fullEvent);
  }

  /**
   * Subscribe to progress events for a sync operation
   */
  subscribe(syncLogId: string, listener: (event: SyncProgressEvent) => void): () => void {
    const channel = `sync:${syncLogId}`;
    this.emitter.on(channel, listener);
    return () => this.emitter.off(channel, listener);
  }

  /**
   * Get stored history for a sync (for catching up on reconnect)
   */
  getHistory(syncLogId: string): SyncProgressEvent[] {
    return this.history.get(syncLogId) || [];
  }

  /**
   * Request abort for a sync operation
   */
  requestAbort(syncLogId: string): void {
    this.abortedSyncs.add(syncLogId);
    this.sendProgress(syncLogId, {
      type: 'aborted',
      message: 'Przerwanie synchronizacji żądane przez administratora...',
    });
  }

  /**
   * Check if a sync has been aborted
   */
  isAborted(syncLogId: string): boolean {
    return this.abortedSyncs.has(syncLogId);
  }

  /**
   * Clean up after sync completes
   */
  cleanup(syncLogId: string): void {
    this.abortedSyncs.delete(syncLogId);
    // Keep history for 10 minutes after completion for late reconnects
    setTimeout(() => {
      this.history.delete(syncLogId);
    }, 10 * 60 * 1000);
  }
}

export const syncProgress = new SyncProgressManager();
