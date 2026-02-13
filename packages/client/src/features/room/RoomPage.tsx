import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { useRoomStore } from '@/stores/room.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { useAuthStore } from '@/stores/auth.store';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import { CanvasView } from '@/features/canvas/CanvasView';
import { Toolbar } from '@/features/canvas/tools/Toolbar';
import { IconSidebar } from '@/features/canvas/tools/IconSidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Users, Info } from 'lucide-react';
import type { CursorPosition } from '@tactihub/shared';
import { CURSOR_THROTTLE_MS } from '@tactihub/shared';
import type { LaserLineData } from '@/features/canvas/CanvasLayer';
import { ChatPanel } from './ChatPanel';
import type { ChatMessage } from '@tactihub/shared';

export default function RoomPage() {
  const { connectionString } = useParams<{ connectionString: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id) ?? null;
  const {
    users, battleplan,
    setUsers, addUser, removeUser, setMyColor, setBattleplan,
    updateCursor, removeCursor, setConnectionString, reset,
    addChatMessage,
  } = useRoomStore();

  const { pushMyDraw, popUndo, popRedo, updateDrawId, clearHistory } = useCanvasStore();
  const cursors = useRoomStore((s) => s.cursors);

  // Peer laser lines state
  const [peerLaserLines, setPeerLaserLines] = useState<LaserLineData[]>([]);
  const cursorThrottleRef = useRef(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isRedoingRef = useRef(false);

  const [chatOpen, setChatOpen] = useState(false);

  // Local-only draws for guests (not persisted)
  const [localDraws, setLocalDraws] = useState<Record<string, any[]>>({});
  const localIdCounter = useRef(0);

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

    socket.on('laser:line', ({ userId, points, color }: { userId: string; points: Array<{ x: number; y: number }>; color: string }) => {
      setPeerLaserLines((prev) => [
        ...prev,
        { id: `${userId}-${Date.now()}`, userId, points, color, fadeStart: undefined },
      ]);
    });

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
      socket.off('laser:line');
      socket.off('chat:messaged');
      disconnectSocket();
      clearHistory();
      reset();
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
    }
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

    const socket = getSocket();
    socket.emit('draw:create', { battleplanFloorId: floorId, draws: drawItems });

    try {
      const res = await apiPost<{ data: any[] }>(`/battleplan-floors/${floorId}/draws`, { items: drawItems });
      if (!isRedoingRef.current) {
        // Track each created draw for undo with correct payload
        for (let i = 0; i < res.data.length; i++) {
          pushMyDraw({ id: res.data[i].id, floorId, payload: drawItems[i] ?? drawItems[0] });
        }
        // Auto-select the last created draw
        if (res.data.length > 0) {
          useCanvasStore.getState().setSelectedDrawId(res.data[res.data.length - 1].id);
        }
      }
      refetchPlan();
    } catch {
      // Persistence failed silently
    }
  }, [isAuthenticated, pushMyDraw]);

  const handleDrawDelete = useCallback(async (drawIds: string[]) => {
    // Handle local draws (guest or authenticated)
    const localIds = drawIds.filter(id => id.startsWith('local-'));
    if (localIds.length > 0) {
      setLocalDraws(prev => {
        const next = { ...prev };
        for (const fid of Object.keys(next)) {
          next[fid] = next[fid]!.filter(d => !localIds.includes(d.id));
        }
        return next;
      });
    }

    // Handle server draws (only when authenticated)
    const serverIds = drawIds.filter(id => !id.startsWith('local-'));
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
    if (entry) {
      handleDrawDelete([entry.id]);
    }
  }, [popUndo, handleDrawDelete]);

  const handleRedo = useCallback(async () => {
    const entry = popRedo();
    if (!entry) return;

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
        const socket = getSocket();
        socket.emit('draw:create', { battleplanFloorId: entry.floorId, draws: [entry.payload] });
        const res = await apiPost<{ data: any[] }>(`/battleplan-floors/${entry.floorId}/draws`, { items: [entry.payload] });
        if (res.data.length > 0) {
          updateDrawId(entry.id, res.data[0].id);
        }
        refetchPlan();
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

      {/* Canvas area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Icon sidebar */}
        {gameSlug && (
          <IconSidebar
            gameSlug={gameSlug}
            open={sidebarOpen}
            onToggle={() => setSidebarOpen((v) => !v)}
          />
        )}

        <ChatPanel open={chatOpen} onToggle={() => setChatOpen(v => !v)} />

        <div className="h-full p-4" style={{ marginLeft: gameSlug && sidebarOpen ? 280 : 0, transition: 'margin-left 0.2s ease-in-out' }}>
          {battleplan?.floors ? (
            <CanvasView
              floors={battleplan.floors}
              onDrawCreate={handleDrawCreate}
              onDrawDelete={handleDrawDelete}
              onDrawUpdate={handleDrawUpdate}
              onLaserLine={handleLaserLine}
              onCursorMove={handleCursorMove}
              peerLaserLines={peerLaserLines}
              cursors={cursors}
              localDraws={localDraws}
              currentUserId={userId}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>No battleplan selected. The room owner can set one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
