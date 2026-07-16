// apps/client/src/store/board.store.ts
import { create } from "zustand";
import type { BoardElement, ToolType, UserPresence } from "../types";

/**
 * Board store — the canvas state
 *
 * This store is the single source of truth for everything on the canvas:
 * - All elements (shapes, text, images)
 * - Which tool is selected
 * - Which elements are selected
 * - Other users' presence (cursors)
 * - Canvas viewport (zoom, pan position)
 *
 * Why keep canvas state in Zustand and not React state?
 * Canvas operations are high frequency — dragging an element
 * fires 60 updates per second. React state re-renders the whole
 * component tree on every update. Zustand only re-renders
 * components that subscribe to the specific piece of state that changed.
 */

interface CanvasViewport {
  x: number;
  y: number;
  scale: number;
}

interface BoardState {
  // canvas elements
  elements: Record<string, BoardElement>;
  selectedIds: string[];

  // tool
  activeTool: ToolType;

  // viewport
  viewport: CanvasViewport;

  // presence
  onlineUsers: UserPresence[];

  // loading
  isLoading: boolean;

  // actions
  setElements: (elements: BoardElement[]) => void;
  addElement: (element: BoardElement) => void;
  updateElement: (id: string, changes: Partial<BoardElement>) => void;
  deleteElement: (id: string) => void;
  bulkDelete: (ids: string[]) => void;

  setSelectedIds: (ids: string[]) => void;
  setActiveTool: (tool: ToolType) => void;
  setViewport: (viewport: Partial<CanvasViewport>) => void;
  setOnlineUsers: (users: UserPresence[]) => void;
  updateUserCursor: (userId: string, cursor: { x: number; y: number }) => void;
  removeUser: (userId: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  elements: {},
  selectedIds: [],
  activeTool: "select" as ToolType,
  viewport: { x: 0, y: 0, scale: 1 },
  onlineUsers: [],
  isLoading: false,
};

export const useBoardStore = create<BoardState>((set) => ({
  ...initialState,

  setElements: (elements) =>
    set({
      elements: elements.reduce(
        (acc, el) => {
          acc[el.id] = el;
          return acc;
        },
        {} as Record<string, BoardElement>,
      ),
    }),

  addElement: (element) =>
    set((state) => ({
      elements: { ...state.elements, [element.id]: element },
    })),

  updateElement: (id, changes) =>
    set((state) => ({
      elements: {
        ...state.elements,
        [id]: { ...state.elements[id], ...changes },
      },
    })),

  deleteElement: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.elements;
      return { elements: rest };
    }),

  bulkDelete: (ids) =>
    set((state) => {
      const elements = { ...state.elements };
      ids.forEach((id) => delete elements[id]);
      return { elements };
    }),

  setSelectedIds: (ids) => set({ selectedIds: ids }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setViewport: (vp) => set((s) => ({ viewport: { ...s.viewport, ...vp } })),
  setLoading: (loading) => set({ isLoading: loading }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  updateUserCursor: (userId, cursor) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.map((u) =>
        u.userId === userId ? { ...u, cursor } : u,
      ),
    })),

  removeUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((u) => u.userId !== userId),
    })),

  reset: () => set(initialState),
}));
