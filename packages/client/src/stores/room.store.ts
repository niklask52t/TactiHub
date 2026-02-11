import { create } from 'zustand';
import type { RoomUser, Battleplan, CursorPosition } from '@strathub/shared';

interface RoomStoreState {
  connectionString: string | null;
  users: RoomUser[];
  myColor: string | null;
  battleplan: Battleplan | null;
  currentFloorId: string | null;
  cursors: Map<string, CursorPosition>;
  setConnectionString: (cs: string) => void;
  setUsers: (users: RoomUser[]) => void;
  addUser: (user: RoomUser) => void;
  removeUser: (userId: string) => void;
  setMyColor: (color: string) => void;
  setBattleplan: (bp: Battleplan | null) => void;
  setCurrentFloorId: (id: string | null) => void;
  updateCursor: (cursor: CursorPosition) => void;
  removeCursor: (userId: string) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStoreState>((set) => ({
  connectionString: null,
  users: [],
  myColor: null,
  battleplan: null,
  currentFloorId: null,
  cursors: new Map(),
  setConnectionString: (cs) => set({ connectionString: cs }),
  setUsers: (users) => set({ users }),
  addUser: (user) => set((s) => ({ users: [...s.users, user] })),
  removeUser: (userId) => set((s) => ({
    users: s.users.filter((u) => u.userId !== userId),
  })),
  setMyColor: (color) => set({ myColor: color }),
  setBattleplan: (bp) => set({ battleplan: bp }),
  setCurrentFloorId: (id) => set({ currentFloorId: id }),
  updateCursor: (cursor) => set((s) => {
    const newCursors = new Map(s.cursors);
    newCursors.set(cursor.userId, cursor);
    return { cursors: newCursors };
  }),
  removeCursor: (userId) => set((s) => {
    const newCursors = new Map(s.cursors);
    newCursors.delete(userId);
    return { cursors: newCursors };
  }),
  reset: () => set({
    connectionString: null,
    users: [],
    myColor: null,
    battleplan: null,
    currentFloorId: null,
    cursors: new Map(),
  }),
}));
