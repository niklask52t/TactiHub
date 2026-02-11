import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import { useRoomStore } from '@/stores/room.store';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import { CanvasView } from '@/features/canvas/CanvasView';
import { Toolbar } from '@/features/canvas/tools/Toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Users } from 'lucide-react';
import type { CursorPosition } from '@strathub/shared';

export default function RoomPage() {
  const { connectionString } = useParams<{ connectionString: string }>();
  const {
    users, battleplan,
    setUsers, addUser, removeUser, setMyColor, setBattleplan,
    updateCursor, removeCursor, setConnectionString, reset,
  } = useRoomStore();

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
      // Peer draws - trigger re-render
      setBattleplan(battleplan ? { ...battleplan } : null);
    });

    socket.on('draw:deleted', () => {
      setBattleplan(battleplan ? { ...battleplan } : null);
    });

    socket.on('battleplan:changed', ({ battleplan: bp }) => {
      setBattleplan(bp);
    });

    socket.on('operator-slot:updated', () => {
      // Update local state
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
      socket.off('operator-slot:updated');
      disconnectSocket();
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
  const { data: planData } = useQuery({
    queryKey: ['battleplan', roomData?.data?.battleplanId],
    queryFn: () => apiGet<{ data: any }>(`/battleplans/${roomData?.data?.battleplanId}`),
    enabled: !!roomData?.data?.battleplanId,
  });

  useEffect(() => {
    if (planData?.data) {
      setBattleplan(planData.data);
    }
  }, [planData]);

  const handleDrawCreate = (floorId: string, draws: any[]) => {
    const socket = getSocket();
    socket.emit('draw:create', { battleplanFloorId: floorId, draws });

    // Also persist via API
    apiPost(`/battleplan-floors/${floorId}/draws`, { items: draws }).catch(() => {});
  };

  const handleDrawDelete = (drawIds: string[]) => {
    const socket = getSocket();
    socket.emit('draw:delete', { drawIds });
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${connectionString}`);
    toast.success('Invite link copied!');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
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
        <Toolbar />
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto p-4">
        {battleplan?.floors ? (
          <CanvasView
            floors={battleplan.floors}
            operatorSlots={battleplan.operatorSlots}
            onDrawCreate={handleDrawCreate}
            onDrawDelete={handleDrawDelete}
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
