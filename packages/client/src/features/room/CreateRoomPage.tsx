import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Users } from 'lucide-react';

interface Game { id: string; name: string; slug: string; icon: string | null; }

export default function CreateRoomPage() {
  const navigate = useNavigate();

  const { data: _gamesData } = useQuery({
    queryKey: ['games'],
    queryFn: () => apiGet<{ data: Game[] }>('/games'),
  });

  const createMutation = useMutation({
    mutationFn: () => apiPost<{ data: { connectionString: string } }>('/rooms', {}),
    onSuccess: (res) => {
      navigate(`/room/${res.data.connectionString}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Create Room</h1>

      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> New Collaboration Room
            </CardTitle>
            <CardDescription>
              Create a room where others can join and draw together in real-time.
              You can select a battleplan after creating the room.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? 'Creating...' : 'Create Room'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
