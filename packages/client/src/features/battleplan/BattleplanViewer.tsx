import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { CanvasView } from '@/features/canvas/CanvasView';

interface BattleplanFull {
  id: string; name: string; description: string | null; notes: string | null;
  isPublic: boolean; gameId: string; mapId: string; ownerId: string;
  owner?: { id: string; username: string };
  floors?: Array<{
    id: string; mapFloorId: string;
    mapFloor?: { id: string; name: string; floorNumber: number; imagePath: string };
    draws?: any[];
  }>;
  operatorSlots?: Array<{ id: string; slotNumber: number; operatorId: string | null; operator?: any }>;
  voteCount?: number; userVote?: number | null;
}

export default function BattleplanViewer() {
  const { gameSlug, planId } = useParams<{ gameSlug: string; planId: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data } = useQuery({
    queryKey: ['battleplan', planId],
    queryFn: () => apiGet<{ data: BattleplanFull }>(`/battleplans/${planId}`),
  });

  const plan = data?.data;

  const handleCopy = async () => {
    try {
      await apiPost(`/battleplans/${planId}/copy`);
      toast.success('Battleplan copied to your plans!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!plan) return <div className="container mx-auto p-8">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild><Link to={`/${gameSlug}/plans`}><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="text-2xl font-bold">{plan.name}</h1>
            {plan.owner && <p className="text-sm text-muted-foreground">by {plan.owner.username}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {plan.isPublic && <Badge>Public</Badge>}
          <span className="text-sm font-medium">Votes: {plan.voteCount ?? 0}</span>
          {isAuthenticated && (
            <Button variant="outline" size="sm" onClick={handleCopy}><Copy className="mr-1 h-3 w-3" /> Copy</Button>
          )}
        </div>
      </div>

      {plan.notes && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{plan.notes}</p></CardContent>
        </Card>
      )}

      <CanvasView
        floors={plan.floors || []}
        operatorSlots={plan.operatorSlots || []}
        readOnly
      />
    </div>
  );
}
