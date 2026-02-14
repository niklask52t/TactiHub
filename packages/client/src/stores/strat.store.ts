import { create } from 'zustand';
import type {
  BattleplanPhase,
  OperatorBan,
  StratConfig,
  StratOperatorSlot,
  StratSide,
  StratMode,
  StratSite,
  ViewMode,
} from '@tactihub/shared';
import { getDefaultLayerVisibility } from '@/data/mainData';

interface StratStoreState {
  // --- Phases ---
  phases: BattleplanPhase[];
  activePhaseId: string | null;
  setPhases: (phases: BattleplanPhase[]) => void;
  setActivePhaseId: (id: string | null) => void;
  addPhase: (phase: BattleplanPhase) => void;
  updatePhase: (phaseId: string, data: Partial<Pick<BattleplanPhase, 'name' | 'description' | 'index'>>) => void;
  removePhase: (phaseId: string) => void;

  // --- Bans ---
  bans: OperatorBan[];
  setBans: (bans: OperatorBan[]) => void;
  setBan: (ban: OperatorBan) => void;
  removeBan: (banId: string) => void;

  // --- Strat Config ---
  stratConfig: StratConfig;
  setStratConfig: (config: Partial<StratConfig>) => void;

  // --- Operator Slots ---
  operatorSlots: StratOperatorSlot[];
  activeOperatorSlotId: string | null;
  setOperatorSlots: (slots: StratOperatorSlot[]) => void;
  setActiveOperatorSlotId: (id: string | null) => void;
  updateOperatorSlot: (slotId: string, data: Partial<StratOperatorSlot>) => void;

  // --- Visibility ---
  landscapeColor: string;
  landscapeVisible: boolean;
  setLandscapeColor: (color: string) => void;
  setLandscapeVisible: (visible: boolean) => void;

  // --- SVG Layer Visibility ---
  svgLayerVisibility: Record<string, boolean>;
  setSvgLayerVisibility: (code: string, visible: boolean) => void;
  resetSvgLayerVisibility: () => void;

  // --- View Mode ---
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // --- Derived helpers ---
  getActiveColor: () => string;
  getAttackerSlots: () => StratOperatorSlot[];
  getDefenderSlots: () => StratOperatorSlot[];
  getVisibleSlotIds: () => Set<string>;
  getBannedOperatorNames: () => Set<string>;

  // --- Reset ---
  reset: () => void;
}

const defaultConfig: StratConfig = {
  side: 'Unknown',
  mode: 'Unknown',
  site: 'Unknown',
};

export const useStratStore = create<StratStoreState>((set, get) => ({
  // --- Phases ---
  phases: [],
  activePhaseId: null,
  setPhases: (phases) => set({ phases }),
  setActivePhaseId: (activePhaseId) => set({ activePhaseId }),
  addPhase: (phase) => set((s) => ({ phases: [...s.phases, phase] })),
  updatePhase: (phaseId, data) => set((s) => ({
    phases: s.phases.map((p) =>
      p.id === phaseId ? { ...p, ...data } : p,
    ),
  })),
  removePhase: (phaseId) => set((s) => {
    const filtered = s.phases.filter((p) => p.id !== phaseId);
    const activePhaseId = s.activePhaseId === phaseId
      ? (filtered[0]?.id ?? null)
      : s.activePhaseId;
    return { phases: filtered, activePhaseId };
  }),

  // --- Bans ---
  bans: [],
  setBans: (bans) => set({ bans }),
  setBan: (ban) => set((s) => {
    // Upsert — replace existing ban for same side+slotIndex
    const filtered = s.bans.filter(
      (b) => !(b.side === ban.side && b.slotIndex === ban.slotIndex),
    );
    return { bans: [...filtered, ban] };
  }),
  removeBan: (banId) => set((s) => ({
    bans: s.bans.filter((b) => b.id !== banId),
  })),

  // --- Strat Config ---
  stratConfig: { ...defaultConfig },
  setStratConfig: (config) => set((s) => ({
    stratConfig: { ...s.stratConfig, ...config },
  })),

  // --- Operator Slots ---
  operatorSlots: [],
  activeOperatorSlotId: null,
  setOperatorSlots: (operatorSlots) => set({ operatorSlots }),
  setActiveOperatorSlotId: (activeOperatorSlotId) => set({ activeOperatorSlotId }),
  updateOperatorSlot: (slotId, data) => set((s) => ({
    operatorSlots: s.operatorSlots.map((slot) =>
      slot.id === slotId ? { ...slot, ...data } : slot,
    ),
  })),

  // --- Visibility ---
  landscapeColor: '#FFFFFF',
  landscapeVisible: true,
  setLandscapeColor: (landscapeColor) => set({ landscapeColor }),
  setLandscapeVisible: (landscapeVisible) => set({ landscapeVisible }),

  // --- SVG Layer Visibility ---
  svgLayerVisibility: getDefaultLayerVisibility(),
  setSvgLayerVisibility: (code, visible) => set((s) => ({
    svgLayerVisibility: { ...s.svgLayerVisibility, [code]: visible },
  })),
  resetSvgLayerVisibility: () => set({ svgLayerVisibility: getDefaultLayerVisibility() }),

  // --- View Mode ---
  viewMode: 'blueprint',
  setViewMode: (viewMode) => set({ viewMode }),

  // --- Derived helpers ---
  getActiveColor: () => {
    const s = get();
    if (!s.activeOperatorSlotId) return s.landscapeColor;
    const slot = s.operatorSlots.find((sl) => sl.id === s.activeOperatorSlotId);
    return slot?.color ?? s.landscapeColor;
  },
  getAttackerSlots: () => {
    return get().operatorSlots
      .filter((s) => s.side === 'attacker')
      .sort((a, b) => a.slotNumber - b.slotNumber);
  },
  getDefenderSlots: () => {
    return get().operatorSlots
      .filter((s) => s.side === 'defender')
      .sort((a, b) => a.slotNumber - b.slotNumber);
  },
  getVisibleSlotIds: () => {
    const s = get();
    const ids = new Set<string>();
    for (const slot of s.operatorSlots) {
      if (slot.visible) ids.add(slot.id);
    }
    return ids;
  },
  getBannedOperatorNames: () => {
    return new Set(get().bans.map((b) => b.operatorName));
  },

  // --- Reset ---
  reset: () => set({
    phases: [],
    activePhaseId: null,
    bans: [],
    stratConfig: { ...defaultConfig },
    operatorSlots: [],
    activeOperatorSlotId: null,
    landscapeColor: '#FFFFFF',
    landscapeVisible: true,
    svgLayerVisibility: getDefaultLayerVisibility(),
    viewMode: 'blueprint',
  }),
}));
