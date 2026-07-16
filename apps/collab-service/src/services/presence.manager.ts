// apps/collab-service/src/services/presence.manager.ts

/**
 * Presence — knowing who is online and where their cursor is
 *
 * This is what makes collaborative tools feel "alive":
 * - See other users' colored cursors moving in real time
 * - See avatars of who's currently on the board
 * - Know when someone joins or leaves
 *
 * How it works:
 * 1. Client connects → we store their presence info
 * 2. Client moves cursor → sends CURSOR_MOVE event every ~50ms
 * 3. Server updates their position and broadcasts to others
 * 4. Client disconnects → we remove them and broadcast USER_LEFT
 *
 * We throttle cursor updates to 50ms (20 per second max)
 * because sending on every pixel movement would be thousands
 * of events per second — too much for the server and network
 */

export interface UserPresence {
  userId: string;
  email: string;
  cursor: { x: number; y: number } | null;
  color: string; // unique color per user for their cursor
  joinedAt: number;
}

class PresenceManager {
  /**
   * boardId → Map of userId → UserPresence
   * Nested map: for each board, track each user's presence
   */
  private presence = new Map<string, Map<string, UserPresence>>();

  /**
   * Assign a consistent color to each user
   * Same user always gets same color on the same board
   * We hash the userId to pick from a predefined palette
   */
  private readonly COLORS = [
    "#E63946",
    "#2A9D8F",
    "#E9C46A",
    "#F4A261",
    "#457B9D",
    "#A8DADC",
    "#6A4C93",
    "#F72585",
  ];

  getUserColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.COLORS[Math.abs(hash) % this.COLORS.length];
  }

  join(
    boardId: string,
    user: Omit<UserPresence, "cursor" | "color" | "joinedAt">,
  ): UserPresence {
    if (!this.presence.has(boardId)) {
      this.presence.set(boardId, new Map());
    }

    const userPresence: UserPresence = {
      ...user,
      cursor: null,
      color: this.getUserColor(user.userId),
      joinedAt: Date.now(),
    };

    this.presence.get(boardId)!.set(user.userId, userPresence);

    return userPresence;
  }

  updateCursor(
    boardId: string,
    userId: string,
    cursor: { x: number; y: number },
  ) {
    const boardPresence = this.presence.get(boardId);
    if (!boardPresence) return;

    const user = boardPresence.get(userId);
    if (user) {
      user.cursor = cursor;
    }
  }

  leave(boardId: string, userId: string) {
    const boardPresence = this.presence.get(boardId);
    if (!boardPresence) return;

    boardPresence.delete(userId);

    // clean up empty boards
    if (boardPresence.size === 0) {
      this.presence.delete(boardId);
    }
  }

  getAll(boardId: string): UserPresence[] {
    return Array.from(this.presence.get(boardId)?.values() ?? []);
  }

  getUser(boardId: string, userId: string): UserPresence | undefined {
    return this.presence.get(boardId)?.get(userId);
  }
}

export const presenceManager = new PresenceManager();
