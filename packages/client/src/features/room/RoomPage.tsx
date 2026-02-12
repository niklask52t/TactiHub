import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { useRoomStore } from '@/stores/room.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { useAuthStore } from '@/stores/auth.store';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import { CanvasView } from '@/features/canvas/CanvasView';
import { Toolbar } from '@/features/canvas/tools/Toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Users, AlertTriangle } from 'lucide-react';
import type { CursorPosition } from '@tactihub/shared';
import { CURSOR_THROTTLE_MS } from '@tactihub/shared';
import type { LaserLineData } from '@/features/canvas/CanvasLayer';

export default function RoomPage() {
  const { connectionString } = useParams<{ connectionString: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const {
    users, battleplan,
    setUsers, addUser, removeUser, setMyColor, setBattleplan,
    updateCursor, removeCursor, setConnectionString, reset,
  } = useRoomStore();

  const { pushMyDraw, popUndo, popRedo, clearHistory } = useCanvasStore();
  const cursors = useRoomStore((s) => s.cursors);

  // Peer laser lines state
  const [peerLaserLines, setPeerLaserLines] = useState<LaserLineData[]>([]);
  const cursorThrottleRef = useRef(0);

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

    socket.on('battleplan:changed', ({ battleplan: bp }) => {
      setBattleplan(bp);
    });

    socket.on('laser:line', ({ userId, points, color }: { userId: string; points: Array<{ x: number; y: number }>; color: string }) => {
      setPeerLaserLines((prev) => {
        // Replace existing line from same user, or add new
        const filtered = prev.filter((l) => l.userId !== userId);
        return [...filtered, { userId, points, color, fadeStart: undefined }];
      });
    });

    return () => {
      socket.emit('room:leave', { connectionString });
      socket.off('room:joined');
      socket.off('room:user-joined');
      socket.off('room:user-left');
      socket.off('cursor:moved');
      socket.off('draw:created');
      socket.off('draw:deleted');
      socket.off('battleplan:changed');
      socket.off('laser:line');
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
    const socket = getSocket();
    socket.emit('draw:create', { battleplanFloorId: floorId, draws: drawItems });

    try {
      const res = await apiPost<{ data: any[] }>(`/battleplan-floors/${floorId}/draws`, { items: drawItems });
      // Track each created draw for undo
      for (const created of res.data) {
        pushMyDraw({ id: created.id, floorId, payload: drawItems[0] });
      }
      refetchPlan();
    } catch {
      // Persistence failed silently
    }
  }, [pushMyDraw]);

  const handleDrawDelete = useCallback(async (drawIds: string[]) => {
    const socket = getSocket();
    socket.emit('draw:delete', { drawIds });

    for (const id of drawIds) {
      apiDelete(`/draws/${id}`).catch(() => {});
    }

    refetchPlan();
  }, [refetchPlan]);

  const handleUndo = useCallback(() => {
    const entry = popUndo();
    if (entry) {
      handleDrawDelete([entry.id]);
    }
  }, [popUndo, handleDrawDelete]);

  const handleRedo = useCallback(async () => {
    const entry = popRedo();
    if (entry) {
      await handleDrawCreate(entry.floorId, [entry.payload]);
    }
  }, [popRedo, handleDrawCreate]);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isAuthenticated) return;
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
  }, [handleUndo, handleRedo, isAuthenticated]);

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
      {/* Guest banner */}
      {!isAuthenticated && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Viewing as guest. <Link to="/auth/login" className="underline font-medium">Log in</Link> to draw.
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
      {isAuthenticated && (
        <div className="flex justify-center py-2 border-b">
          <Toolbar onUndo={handleUndo} onRedo={handleRedo} gameSlug={gameSlug} />
        </div>
      )}

      {/* Canvas area */}
      <div className="flex-1 overflow-hidden p-4">
        {battleplan?.floors ? (
          <CanvasView
            floors={battleplan.floors}
            readOnly={!isAuthenticated}
            onDrawCreate={handleDrawCreate}
            onDrawDelete={handleDrawDelete}
            onLaserLine={handleLaserLine}
            onCursorMove={handleCursorMove}
            peerLaserLines={peerLaserLines}
            cursors={cursors}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No battleplan selected. The room owner can set one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
