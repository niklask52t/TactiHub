import { create } from 'zustand';
import type { RoomUser, Battleplan, CursorPosition, ChatMessage, OperatorSlot } from '@tactihub/shared';

interface RoomStoreState {
  connectionString: string | null;
  users: RoomUser[];
  myColor: string | null;
  battleplan: Battleplan | null;
  currentFloorId: string | null;
  cursors: Map<string, CursorPosition>;
  chatMessages: ChatMessage[];
  unreadCount: number;
  setConnectionString: (cs: string) => void;
  setUsers: (users: RoomUser[]) => void;
  addUser: (user: RoomUser) => void;
  removeUser: (userId: string) => void;
  setMyColor: (color: string) => void;
  setBattleplan: (bp: Battleplan | null) => void;
  setCurrentFloorId: (id: string | null) => void;
  updateCursor: (cursor: CursorPosition) => void;
  removeCursor: (userId: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  resetUnread: () => void;
  updateOperatorSlot: (slotId: string, operatorId: string | null, operator: unknown, side: string) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStoreState>((set) => ({
  connectionString: null,
  users: [],
  myColor: null,
  battleplan: null,
  currentFloorId: null,
  cursors: new Map(),
  chatMessages: [],
  unreadCount: 0,
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
  addChatMessage: (msg) => set((s) => ({
    chatMessages: [...s.chatMessages, msg],
    unreadCount: s.unreadCount + 1,
  })),
  resetUnread: () => set({ unreadCount: 0 }),
  updateOperatorSlot: (slotId, operatorId, operator, side) => set((s) => {
    if (!s.battleplan?.operatorSlots) return s;
    const updatedSlots = s.battleplan.operatorSlots.map((slot) =>
      slot.id === slotId ? { ...slot, operatorId, operator: operator as OperatorSlot['operator'], side: side as OperatorSlot['side'] } : slot
    );
    return { battleplan: { ...s.battleplan, operatorSlots: updatedSlots } };
  }),
  reset: () => set({
    connectionString: null,
    users: [],
    myColor: null,
    battleplan: null,
    currentFloorId: null,
    cursors: new Map(),
    chatMessages: [],
    unreadCount: 0,
  }),
}));
