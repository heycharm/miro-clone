// apps/collab-service/src/services/ydoc.manager.ts
import * as Y from "yjs";

/**
 * What is Y.js and why do we need it?
 *
 * Problem: two users move the same element at the same time
 * User A moves rect to (100, 200)
 * User B moves same rect to (300, 400)
 * Both changes arrive at server almost simultaneously
 *
 * Naive solution: last-write-wins
 * → whoever's update arrives last wins
 * → the other user sees their change suddenly jump back
 * → terrible UX, feels broken
 *
 * Y.js solution: CRDT (Conflict-free Replicated Data Type)
 * → mathematical data structures that can ALWAYS be merged
 *   without conflicts, regardless of order or timing
 * → both changes are preserved and merged deterministically
 * → every client ends up with the same final state
 * → no conflicts, no lost updates, no coordination needed
 *
 * Y.Doc is a Y.js document — think of it as a special object
 * where every property supports conflict-free merging
 *
 * Y.Map  → like a JS object, keys can be set by multiple users
 * Y.Array → like a JS array, supports concurrent inserts/deletes
 * Y.Text  → like a string, supports collaborative text editing
 *
 * We use Y.Map for board elements because each element is
 * an object with properties that multiple users can update
 */

interface DocEntry {
  doc: Y.Doc;
  /**
   * lastAccessed — timestamp of last activity
   * We use this to clean up inactive documents from memory
   * If nobody has been on a board for 30 minutes,
   * we remove its Y.Doc from memory to prevent memory leaks
   * Next time someone joins, we rebuild it from DB
   */
  lastAccessed: number;
}

class YDocManager {
  /**
   * Map of boardId → Y.Doc
   * In-memory store of all active board documents
   * One Y.Doc per board that has at least one active user
   */
  private docs = new Map<string, DocEntry>();
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // check every 5 min
  private readonly MAX_IDLE_TIME = 30 * 60 * 1000; // remove after 30 min idle

  constructor() {
    // periodically clean up idle documents
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * getOrCreate — get existing doc for a board or create a new one
   * This ensures only ONE Y.Doc exists per board in memory
   * even if multiple users join simultaneously
   */
  getOrCreate(boardId: string): Y.Doc {
    const existing = this.docs.get(boardId);

    if (existing) {
      existing.lastAccessed = Date.now();
      return existing.doc;
    }

    const doc = new Y.Doc();

    /**
     * elements is a Y.Map where:
     * key   = elementId (string)
     * value = element data object (position, size, properties etc)
     *
     * When two users update the same element simultaneously:
     * Y.js merges the changes at the property level using
     * Last-Write-Wins per property with Lamport timestamps
     * So if User A changes fill and User B changes x position,
     * both changes survive — no conflict
     */
    doc.getMap("elements");

    this.docs.set(boardId, { doc, lastAccessed: Date.now() });

    console.log(`[ydoc] Created doc for board: ${boardId}`);

    return doc;
  }

  get(boardId: string): Y.Doc | undefined {
    const entry = this.docs.get(boardId);
    if (entry) {
      entry.lastAccessed = Date.now();
      return entry.doc;
    }
    return undefined;
  }

  delete(boardId: string) {
    const entry = this.docs.get(boardId);
    if (entry) {
      /**
       * Y.Doc must be destroyed explicitly to free memory
       * Y.js keeps internal event listeners and observers
       * that prevent garbage collection unless you call destroy()
       */
      entry.doc.destroy();
      this.docs.delete(boardId);
      console.log(`[ydoc] Destroyed doc for board: ${boardId}`);
    }
  }

  private cleanup() {
    const now = Date.now();

    for (const [boardId, entry] of this.docs.entries()) {
      if (now - entry.lastAccessed > this.MAX_IDLE_TIME) {
        this.delete(boardId);
        console.log(`[ydoc] Cleaned up idle doc for board: ${boardId}`);
      }
    }
  }
}

// singleton — one manager for the entire process
export const ydocManager = new YDocManager();
