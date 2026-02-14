import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { useRoomStore } from '@/stores/room.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { useAuthStore } from '@/stores/auth.store';
import { useStratStore } from '@/stores/strat.store';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import { CanvasView } from '@/features/canvas/CanvasView';
import { Toolbar } from '@/features/canvas/tools/Toolbar';
import { IconSidebar } from '@/features/canvas/tools/IconSidebar';
import StratLayout from '@/features/strat/StratLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Users, Info, Settings, X } from 'lucide-react';
import type { CursorPosition } from '@tactihub/shared';
import { CURSOR_THROTTLE_MS } from '@tactihub/shared';
import type { LaserLineData } from '@/features/canvas/CanvasLayer';
import { ChatPanel } from './ChatPanel';
import type { ChatMessage } from '@tactihub/shared';

const SUGGESTED_TAGS = ['Aggressive', 'Default', 'Retake', 'Rush', 'Anchor', 'Roam', 'Site A', 'Site B'];

export default function RoomPage() {
  const { connectionString } = useParams<{ connectionString: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id) ?? null;
  const {
    users, battleplan,
    setUsers, addUser, removeUser, setMyColor, setBattleplan,
    updateCursor, removeCursor, setConnectionString, reset,
    addChatMessage, updateOperatorSlot,
  } = useRoomStore();

  const { pushMyDraw, popUndo, popRedo, updateDrawId, clearHistory, setColor } = useCanvasStore();
  const cursors = useRoomStore((s) => s.cursors);

  // Strat store
  const {
    activePhaseId, operatorSlots, activeOperatorSlotId,
    setPhases, setActivePhaseId, addPhase, updatePhase, removePhase,
    setBans, setBan, removeBan: removeStoreBan,
    setStratConfig, setOperatorSlots, updateOperatorSlot: updateStratSlot,
    getActiveColor, getVisibleSlotIds, landscapeVisible,
    reset: resetStrat,
  } = useStratStore();

  // Peer laser lines state
  const [peerLaserLines, setPeerLaserLines] = useState<LaserLineData[]>([]);
  const cursorThrottleRef = useRef(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isRedoingRef = useRef(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editPublic, setEditPublic] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Local draws: guest draws (local-*) + authenticated optimistic draws (optimistic-* → server UUIDs)
  const [localDraws, setLocalDraws] = useState<Record<string, any[]>>({});
  const localIdCounter = useRef(0);
  const optimisticIdCounter = useRef(0);

  useEffect(() => {
    if (!connectionString) return;
    setConnectionString(connectionString);

    connectSocket();
    const socket = getSocket();

    socket.emit('room:join', { connectionString });

    socket.on('room:joined', ({ color, users: roomUsers }) => {
      setMyColor(color);
      setUsers(roomUsers);
    });

    socket.on('room:user-joined', ({ userId, username, color }) => {
      addUser({ userId, username, color });
      toast.info(`${username} joined`);
    });

    socket.on('room:user-left', ({ userId }) => {
      removeUser(userId);
      removeCursor(userId);
    });

    socket.on('cursor:moved', (cursor: CursorPosition) => {
      updateCursor(cursor);
    });

    socket.on('draw:created', () => {
      refetchPlan();
    });

    socket.on('draw:deleted', () => {
      refetchPlan();
    });

    socket.on('draw:updated', () => {
      refetchPlan();
    });

    socket.on('battleplan:changed', ({ battleplan: bp }) => {
      setBattleplan(bp);
    });

    socket.on('chat:messaged', (msg: ChatMessage) => {
      addChatMessage(msg);
    });

    socket.on('operator-slot:updated', ({ slotId, operatorId, operator, side }: { slotId: string; operatorId: string | null; operator: unknown; side: string }) => {
      updateOperatorSlot(slotId, operatorId, operator, side);
    });

    socket.on('attacker-lineup:created', () => {
      refetchPlan();
    });

    socket.on('laser:line', ({ userId, points, color }: { userId: string; points: Array<{ x: number; y: number }>; color: string }) => {
      setPeerLaserLines((prev) => [
        ...prev,
        { id: `${userId}-${Date.now()}`, userId, points, color, fadeStart: undefined },
      ]);
    });

    // Strat sync events
    socket.on('strat:phase-created', () => refetchPlan());
    socket.on('strat:phase-updated', () => refetchPlan());
    socket.on('strat:phase-deleted', () => refetchPlan());
    socket.on('strat:phase-switched', ({ phaseId }: { phaseId: string }) => {
      useStratStore.getState().setActivePhaseId(phaseId);
    });
    socket.on('strat:ban-updated', () => refetchPlan());
    socket.on('strat:ban-removed', () => refetchPlan());
    socket.on('strat:config-updated', () => refetchPlan());
    socket.on('strat:loadout-updated', () => refetchPlan());
    socket.on('strat:visibility-toggled', ({ slotId, visible }: { slotId: string; visible: boolean }) => {
      useStratStore.getState().updateOperatorSlot(slotId, { visible });
    });
    socket.on('strat:color-updated', ({ slotId, color }: { slotId: string; color: string }) => {
      useStratStore.getState().updateOperatorSlot(slotId, { color });
    });
    socket.on('strat:slot-updated', () => refetchPlan());

    return () => {
      socket.emit('room:leave', { connectionString });
      socket.off('room:joined');
      socket.off('room:user-joined');
      socket.off('room:user-left');
      socket.off('cursor:moved');
      socket.off('draw:created');
      socket.off('draw:deleted');
      socket.off('draw:updated');
      socket.off('battleplan:changed');
      socket.off('operator-slot:updated');
      socket.off('attacker-lineup:created');
      socket.off('laser:line');
      socket.off('chat:messaged');
      socket.off('strat:phase-created');
      socket.off('strat:phase-updated');
      socket.off('strat:phase-deleted');
      socket.off('strat:phase-switched');
      socket.off('strat:ban-updated');
      socket.off('strat:ban-removed');
      socket.off('strat:config-updated');
      socket.off('strat:loadout-updated');
      socket.off('strat:visibility-toggled');
      socket.off('strat:color-updated');
      socket.off('strat:slot-updated');
      disconnectSocket();
      clearHistory();
      reset();
      resetStrat();
    };
  }, [connectionString]);

  // Load room data
  const { data: roomData } = useQuery({
    queryKey: ['room', connectionString],
    queryFn: () => apiGet<{ data: any }>(`/rooms/${connectionString}`),
    enabled: !!connectionString,
  });

  // Load battleplan if room has one
  const { data: planData, refetch: refetchPlan } = useQuery({
    queryKey: ['battleplan', roomData?.data?.battleplanId],
    queryFn: () => apiGet<{ data: any }>(`/battleplans/${roomData?.data?.battleplanId}`),
    enabled: !!roomData?.data?.battleplanId,
  });

  const gameSlug = planData?.data?.game?.slug as string | undefined;

  useEffect(() => {
    if (planData?.data) {
      setBattleplan(planData.data);

      // Initialize strat store from battleplan data
      if (planData.data.phases) {
        setPhases(planData.data.phases);
        if (!activePhaseId && planData.data.phases.length > 0) {
          setActivePhaseId(planData.data.phases[0].id);
        }
      }
      if (planData.data.bans) setBans(planData.data.bans);
      if (planData.data.stratSlots) setOperatorSlots(planData.data.stratSlots);
      if (planData.data.stratSide || planData.data.stratMode || planData.data.stratSite) {
        setStratConfig({
          side: planData.data.stratSide || 'Unknown',
          mode: planData.data.stratMode || 'Unknown',
          site: planData.data.stratSite || 'Unknown',
        });
      }
    }
  }, [planData]);

  // Deduplication: remove optimistic draws once they appear in server data
  useEffect(() => {
    if (!planData?.data?.floors) return;
    const serverDrawIds = new Set<string>();
    for (const floor of planData.data.floors) {
      for (const draw of (floor.draws || [])) {
        serverDrawIds.add(draw.id);
      }
    }
    setLocalDraws(prev => {
      let changed = false;
      const next: Record<string, any[]> = {};
      for (const [fid, draws] of Object.entries(prev)) {
        const filtered = draws.filter(d => {
          // Keep guest draws (local-*) and still-pending optimistic draws
          if (d.id.startsWith('local-') || d.id.startsWith('optimistic-')) return true;
          // Remove server-ID draws that now exist in planData (they've been confirmed)
          if (serverDrawIds.has(d.id)) { changed = true; return false; }
          return true;
        });
        next[fid] = filtered;
      }
      return changed ? next : prev;
    });
  }, [planData]);

  const handleDrawCreate = useCallback(async (floorId: string, drawItems: any[]) => {
    if (!isAuthenticated) {
      // Guest: store locally, no API/socket calls
      const newDraws = drawItems.map(item => ({
        ...item,
        id: `local-${++localIdCounter.current}`,
        isLocal: true,
      }));
      setLocalDraws(prev => ({
        ...prev,
        [floorId]: [...(prev[floorId] || []), ...newDraws],
      }));
      if (!isRedoingRef.current) {
        for (let i = 0; i < newDraws.length; i++) {
          pushMyDraw({ id: newDraws[i].id, floorId, payload: drawItems[i] });
        }
      }
      return;
    }

    // Authenticated: add optimistic draws immediately so eraser/select/floor-switch work
    const tempIds = drawItems.map(() => `optimistic-${++optimisticIdCounter.current}`);
    const optimisticDraws = drawItems.map((item, i) => ({
      ...item,
      id: tempIds[i],
      userId: userId,
      isDeleted: false,
    }));
    setLocalDraws(prev => ({
      ...prev,
      [floorId]: [...(prev[floorId] || []), ...optimisticDraws],
    }));

    const socket = getSocket();
    socket.emit('draw:create', { battleplanFloorId: floorId, draws: drawItems });

    try {
      const res = await apiPost<{ data: any[] }>(`/battleplan-floors/${floorId}/draws`, { items: drawItems });

      // Replace temp IDs with server IDs in localDraws
      setLocalDraws(prev => {
        const floorDraws = prev[floorId] || [];
        const updated = floorDraws.map(d => {
          const tempIndex = tempIds.indexOf(d.id);
          return tempIndex >= 0 && res.data[tempIndex] ? { ...d, id: res.data[tempIndex].id } : d;
        });
        return { ...prev, [floorId]: updated };
      });

      if (!isRedoingRef.current) {
        for (let i = 0; i < res.data.length; i++) {
          pushMyDraw({ id: res.data[i].id, floorId, payload: drawItems[i] ?? drawItems[0] });
        }
        if (res.data.length > 0) {
          useCanvasStore.getState().setSelectedDrawId(res.data[res.data.length - 1].id);
        }
      }
      refetchPlan();
    } catch {
      // Remove optimistic draws on failure
      const tempIdSet = new Set(tempIds);
      setLocalDraws(prev => ({
        ...prev,
        [floorId]: (prev[floorId] || []).filter(d => !tempIdSet.has(d.id)),
      }));
    }
  }, [isAuthenticated, userId, pushMyDraw]);

  const handleDrawDelete = useCallback(async (drawIds: string[]) => {
    // Remove from localDraws (handles guest local-*, optimistic-*, and server-ID optimistic draws)
    const idSet = new Set(drawIds);
    setLocalDraws(prev => {
      const next = { ...prev };
      let changed = false;
      for (const fid of Object.keys(next)) {
        const filtered = next[fid]!.filter(d => !idSet.has(d.id));
        if (filtered.length !== next[fid]!.length) { next[fid] = filtered; changed = true; }
      }
      return changed ? next : prev;
    });

    // Handle server draws (only when authenticated)
    const serverIds = drawIds.filter(id => !id.startsWith('local-') && !id.startsWith('optimistic-'));
    if (serverIds.length > 0 && isAuthenticated) {
      const socket = getSocket();
      socket.emit('draw:delete', { drawIds: serverIds });

      for (const id of serverIds) {
        apiDelete(`/draws/${id}`).catch(() => {});
      }

      refetchPlan();
    }
  }, [isAuthenticated, refetchPlan]);

  const handleDrawUpdate = useCallback(async (drawId: string, updates: any) => {
    if (!isAuthenticated) return;

    // Apply update optimistically in localDraws (for draws that are still optimistic)
    setLocalDraws(prev => {
      const next = { ...prev };
      let changed = false;
      for (const fid of Object.keys(next)) {
        next[fid] = next[fid]!.map(d => {
          if (d.id === drawId) {
            changed = true;
            return { ...d, ...updates, data: updates.data ? { ...d.data, ...updates.data } : d.data };
          }
          return d;
        });
      }
      return changed ? next : prev;
    });

    const socket = getSocket();
    socket.emit('draw:update', { drawId, data: updates });
    try {
      await apiPut(`/draws/${drawId}`, updates);
      refetchPlan();
    } catch {
      // Silent failure
    }
  }, [isAuthenticated, refetchPlan]);

  const handleUndo = useCallback(() => {
    const entry = popUndo();
    if (!entry) return;
    if (entry.action === 'update') {
      handleDrawUpdate(entry.id, entry.previousState);
    } else {
      handleDrawDelete([entry.id]);
    }
  }, [popUndo, handleDrawDelete, handleDrawUpdate]);

  const handleRedo = useCallback(async () => {
    const entry = popRedo();
    if (!entry) return;

    // Redo an update: re-apply the new state
    if (entry.action === 'update') {
      handleDrawUpdate(entry.id, entry.payload);
      return;
    }

    isRedoingRef.current = true;
    try {
      if (!isAuthenticated) {
        // Guest: recreate locally
        const newId = `local-${++localIdCounter.current}`;
        const newDraw = { ...entry.payload, id: newId, isLocal: true };
        setLocalDraws(prev => ({
          ...prev,
          [entry.floorId]: [...(prev[entry.floorId] || []), newDraw],
        }));
        updateDrawId(entry.id, newId);
      } else {
        // Authenticated redo: add optimistic draw immediately
        const tempId = `optimistic-${++optimisticIdCounter.current}`;
        const optimisticDraw = { ...entry.payload, id: tempId, userId, isDeleted: false };
        setLocalDraws(prev => ({
          ...prev,
          [entry.floorId]: [...(prev[entry.floorId] || []), optimisticDraw],
        }));

        const socket = getSocket();
        socket.emit('draw:create', { battleplanFloorId: entry.floorId, draws: [entry.payload] });
        try {
          const res = await apiPost<{ data: any[] }>(`/battleplan-floors/${entry.floorId}/draws`, { items: [entry.payload] });
          if (res.data.length > 0) {
            // Replace temp ID with server ID in localDraws
            setLocalDraws(prev => ({
              ...prev,
              [entry.floorId]: (prev[entry.floorId] || []).map(d =>
                d.id === tempId ? { ...d, id: res.data[0].id } : d
              ),
            }));
            updateDrawId(entry.id, res.data[0].id);
          }
          refetchPlan();
        } catch {
          // Remove optimistic draw on failure
          setLocalDraws(prev => ({
            ...prev,
            [entry.floorId]: (prev[entry.floorId] || []).filter(d => d.id !== tempId),
          }));
        }
      }
    } catch {
      // Silent failure
    } finally {
      isRedoingRef.current = false;
    }
  }, [popRedo, isAuthenticated, updateDrawId]);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  const handleSlotChange = useCallback(async (slotId: string, operatorId: string | null) => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    socket.emit('operator-slot:update', { slotId, operatorId });
  }, [isAuthenticated]);

  const handleCreateAttackerLineup = useCallback(async () => {
    if (!isAuthenticated || !battleplan) return;
    try {
      const res = await apiPost<{ data: any }>(`/battleplans/${battleplan.id}/attacker-lineup`, {});
      setBattleplan(res.data);
      const socket = getSocket();
      socket.emit('attacker-lineup:create', { battleplanId: battleplan.id });
    } catch {
      toast.error('Failed to create attacker lineup');
    }
  }, [isAuthenticated, battleplan, setBattleplan]);

  const handleRemoveAttackerLineup = useCallback(async () => {
    if (!isAuthenticated || !battleplan) return;
    try {
      await apiDelete(`/battleplans/${battleplan.id}/attacker-lineup`);
      refetchPlan();
    } catch {
      toast.error('Failed to remove attacker lineup');
    }
  }, [isAuthenticated, battleplan, refetchPlan]);

  // --- Strat handlers ---
  const handlePhaseCreate = useCallback(async (name: string) => {
    if (!isAuthenticated || !battleplan) return;
    try {
      const res = await apiPost<{ data: any }>(`/battleplans/${battleplan.id}/phases`, { name });
      addPhase(res.data);
      getSocket().emit('strat:phase-create', { battleplanId: battleplan.id, name });
    } catch { toast.error('Failed to create phase'); }
  }, [isAuthenticated, battleplan, addPhase]);

  const handlePhaseUpdate = useCallback(async (phaseId: string, name: string) => {
    if (!isAuthenticated || !battleplan) return;
    try {
      await apiPost(`/battleplans/${battleplan.id}/phases/${phaseId}/update`, { name });
      updatePhase(phaseId, { name });
      getSocket().emit('strat:phase-update', { phaseId, name });
    } catch { toast.error('Failed to update phase'); }
  }, [isAuthenticated, battleplan, updatePhase]);

  const handlePhaseDelete = useCallback(async (phaseId: string) => {
    if (!isAuthenticated || !battleplan) return;
    try {
      await apiPost(`/battleplans/${battleplan.id}/phases/${phaseId}/delete`, {});
      removePhase(phaseId);
      getSocket().emit('strat:phase-delete', { phaseId });
      refetchPlan();
    } catch { toast.error('Failed to delete phase'); }
  }, [isAuthenticated, battleplan, removePhase, refetchPlan]);

  const handlePhaseSwitch = useCallback((phaseId: string) => {
    setActivePhaseId(phaseId);
    getSocket().emit('strat:phase-switch', { phaseId });
  }, [setActivePhaseId]);

  const handleBanUpdate = useCallback(async (operatorName: string, side: 'attacker' | 'defender', slotIndex: number) => {
    if (!isAuthenticated || !battleplan) return;
    try {
      const res = await apiPost<{ data: any }>(`/battleplans/${battleplan.id}/bans`, { operatorName, side, slotIndex });
      setBan(res.data);
      getSocket().emit('strat:ban-update', { battleplanId: battleplan.id, operatorName, side, slotIndex });
    } catch { toast.error('Failed to set ban'); }
  }, [isAuthenticated, battleplan, setBan]);

  const handleBanRemove = useCallback(async (banId: string) => {
    if (!isAuthenticated || !battleplan) return;
    try {
      await apiPost(`/battleplans/${battleplan.id}/bans/${banId}/delete`, {});
      removeStoreBan(banId);
      getSocket().emit('strat:ban-remove', { banId });
    } catch { toast.error('Failed to remove ban'); }
  }, [isAuthenticated, battleplan, removeStoreBan]);

  const handleConfigChange = useCallback(async (config: Record<string, any>) => {
    if (!isAuthenticated || !battleplan) return;
    try {
      await apiPost(`/battleplans/${battleplan.id}/strat-config`, config);
      setStratConfig(config as any);
      getSocket().emit('strat:config-update', { battleplanId: battleplan.id, ...config });
    } catch { toast.error('Failed to update config'); }
  }, [isAuthenticated, battleplan, setStratConfig]);

  const handleStratSlotUpdate = useCallback(async (slotId: string, data: Record<string, any>) => {
    if (!isAuthenticated) return;
    try {
      await apiPost(`/operator-slots/${slotId}`, data);
      updateStratSlot(slotId, data as any);
      getSocket().emit('strat:slot-update', { slotId, ...data });
      refetchPlan();
    } catch { toast.error('Failed to update operator slot'); }
  }, [isAuthenticated, updateStratSlot, refetchPlan]);

  const handleStratLoadoutChange = useCallback(async (slotId: string, field: string, value: string | null) => {
    if (!isAuthenticated) return;
    try {
      await apiPost(`/operator-slots/${slotId}/loadout`, { [field]: value });
      updateStratSlot(slotId, { [field]: value } as any);
      getSocket().emit('strat:loadout-update', { slotId, [field]: value });
    } catch { toast.error('Failed to update loadout'); }
  }, [isAuthenticated, updateStratSlot]);

  const handleStratVisibilityToggle = useCallback(async (slotId: string, visible: boolean) => {
    if (!isAuthenticated) return;
    try {
      await apiPost(`/operator-slots/${slotId}/visibility`, { visible });
      updateStratSlot(slotId, { visible });
      getSocket().emit('strat:visibility-toggle', { slotId, visible });
    } catch { toast.error('Failed to toggle visibility'); }
  }, [isAuthenticated, updateStratSlot]);

  const handleStratColorChange = useCallback(async (slotId: string, color: string) => {
    if (!isAuthenticated) return;
    try {
      await apiPost(`/operator-slots/${slotId}/color`, { color });
      updateStratSlot(slotId, { color });
      getSocket().emit('strat:color-update', { slotId, color });
    } catch { toast.error('Failed to update color'); }
  }, [isAuthenticated, updateStratSlot]);

  // Sync draw color from active operator slot
  useEffect(() => {
    const activeColor = getActiveColor();
    setColor(activeColor);
  }, [activeOperatorSlotId, operatorSlots, getActiveColor, setColor]);

  // Inject phaseId + operatorSlotId into draw creation
  const wrappedDrawCreate = useCallback(async (floorId: string, drawItems: any[]) => {
    const enriched = drawItems.map(item => ({
      ...item,
      phaseId: activePhaseId || undefined,
      operatorSlotId: activeOperatorSlotId || undefined,
    }));
    return handleDrawCreate(floorId, enriched);
  }, [handleDrawCreate, activePhaseId, activeOperatorSlotId]);

  const handleLaserLine = useCallback((points: Array<{ x: number; y: number }>, color: string) => {
    const socket = getSocket();
    socket.emit('laser:line', { points, color });
  }, []);

  const handleCursorMove = useCallback((x: number, y: number, isLaser: boolean) => {
    const now = Date.now();
    if (now - cursorThrottleRef.current < CURSOR_THROTTLE_MS) return;
    cursorThrottleRef.current = now;
    const socket = getSocket();
    const floorId = battleplan?.floors?.[0]?.id || '';
    socket.emit('cursor:move', { x, y, floorId, isLaser });
  }, [battleplan]);

  // When a peer laser line hasn't been updated for 100ms, start its fade
  useEffect(() => {
    if (peerLaserLines.length === 0) return;
    const timer = setTimeout(() => {
      setPeerLaserLines((prev) =>
        prev.map((l) => l.fadeStart ? l : { ...l, fadeStart: Date.now() })
      );
    }, 100);
    return () => clearTimeout(timer);
  }, [peerLaserLines]);

  // Clean up fully faded peer laser lines
  useEffect(() => {
    if (peerLaserLines.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setPeerLaserLines((prev) => prev.filter((l) => !l.fadeStart || now - l.fadeStart < 3000));
    }, 500);
    return () => clearInterval(timer);
  }, [peerLaserLines.length]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${connectionString}`);
    toast.success('Invite link copied!');
  };

  const isOwner = battleplan && userId && battleplan.ownerId === userId;

  const openSettings = useCallback(() => {
    if (!battleplan) return;
    setEditName(battleplan.name || '');
    setEditDesc(battleplan.description || '');
    setEditNotes(battleplan.notes || '');
    setEditTags(battleplan.tags || []);
    setEditPublic(battleplan.isPublic || false);
    setTagInput('');
    setSettingsOpen(true);
  }, [battleplan]);

  const handleSaveSettings = useCallback(async () => {
    if (!battleplan) return;
    setSaving(true);
    try {
      await apiPut(`/battleplans/${battleplan.id}`, {
        name: editName,
        description: editDesc,
        notes: editNotes,
        tags: editTags,
        isPublic: editPublic,
      });
      toast.success('Plan saved');
      setSettingsOpen(false);
      refetchPlan();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [battleplan, editName, editDesc, editNotes, editTags, editPublic, refetchPlan]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !editTags.includes(trimmed) && editTags.length < 10) {
      setEditTags(prev => [...prev, trimmed]);
    }
    setTagInput('');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Guest info banner */}
      {!isAuthenticated && (
        <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-muted/50 border-b text-sm text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          Guest mode — changes won&apos;t be saved. <Link to="/auth/login" className="underline font-medium text-primary">Log in</Link> to persist.
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Exit</Link>
          </Button>
          <span className="text-sm font-medium">
            Room: <code className="bg-muted px-1 rounded">{connectionString}</code>
          </span>
          <Button variant="ghost" size="sm" onClick={copyInviteLink}>
            <Copy className="h-3 w-3 mr-1" /> Copy Link
          </Button>
          {battleplan?.map?.name && (
            <span className="ml-4 text-sm font-medium text-white">{battleplan.map.name}</span>
          )}
          {isOwner && (
            <Button variant="ghost" size="sm" onClick={openSettings}>
              <Settings className="h-4 w-4 mr-1" /> Plan Settings
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          {users.map((u) => (
            <Badge key={u.userId} variant="outline" style={{ borderColor: u.color, color: u.color }}>
              {u.username}
            </Badge>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-center py-2 border-b">
        <Toolbar onUndo={handleUndo} onRedo={handleRedo} />
      </div>

      {/* Canvas area with strat layout */}
      <div className="flex-1 overflow-hidden relative">
        {battleplan?.floors ? (
          <StratLayout
            onSlotUpdate={handleStratSlotUpdate}
            onLoadoutChange={handleStratLoadoutChange}
            onVisibilityToggle={handleStratVisibilityToggle}
            onColorChange={handleStratColorChange}
            onBanUpdate={handleBanUpdate}
            onBanRemove={handleBanRemove}
            onConfigChange={handleConfigChange}
            onPhaseCreate={handlePhaseCreate}
            onPhaseUpdate={handlePhaseUpdate}
            onPhaseDelete={handlePhaseDelete}
            onPhaseSwitch={handlePhaseSwitch}
            readOnly={!isAuthenticated}
          >
            {/* Icon sidebar (inside strat layout center area) */}
            {gameSlug && (
              <IconSidebar
                gameSlug={gameSlug}
                open={sidebarOpen}
                onToggle={() => setSidebarOpen((v) => !v)}
                battleplanId={battleplan?.id}
                operatorSlots={battleplan?.operatorSlots}
                onSlotChange={handleSlotChange}
                onCreateAttackerLineup={handleCreateAttackerLineup}
                onRemoveAttackerLineup={handleRemoveAttackerLineup}
                isAuthenticated={isAuthenticated}
              />
            )}

            <ChatPanel open={chatOpen} onToggle={() => setChatOpen(v => !v)} />

            <div className="h-full p-2" style={{ marginLeft: gameSlug && sidebarOpen ? 280 : 0, transition: 'margin-left 0.2s ease-in-out' }}>
              <CanvasView
                floors={battleplan.floors}
                onDrawCreate={wrappedDrawCreate}
                onDrawDelete={handleDrawDelete}
                onDrawUpdate={handleDrawUpdate}
                onLaserLine={handleLaserLine}
                onCursorMove={handleCursorMove}
                peerLaserLines={peerLaserLines}
                cursors={cursors}
                localDraws={localDraws}
                currentUserId={userId}
                activePhaseId={activePhaseId}
                visibleSlotIds={getVisibleSlotIds()}
                landscapeVisible={landscapeVisible}
                mapSlug={battleplan?.map?.slug}
              />
            </div>
          </StratLayout>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No battleplan selected. The room owner can set one.</p>
          </div>
        )}
      </div>

      {/* Plan settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Plan Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} placeholder="Brief description..." />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} placeholder="Strategy notes..." />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              {editTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {editTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => setEditTags(t => t.filter(x => x !== tag))}>
                      {tag} <X className="h-2 w-2 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); addTag(tagInput); } }}
                placeholder="Add tag and press Enter"
              />
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_TAGS.filter(t => !editTags.includes(t)).map((tag) => (
                  <Badge key={tag} variant="outline" className="cursor-pointer text-xs" onClick={() => addTag(tag)}>
                    + {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="plan-public" checked={editPublic} onCheckedChange={setEditPublic} />
              <Label htmlFor="plan-public">Public</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={saving || !editName.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
