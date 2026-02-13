import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Copy, Share2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { CanvasView } from '@/features/canvas/CanvasView';

const SUGGESTED_TAGS = ['Aggressive', 'Default', 'Retake', 'Rush', 'Anchor', 'Roam', 'Site A', 'Site B'];

interface BattleplanFull {
  id: string; name: string; description: string | null; notes: string | null; tags: string[];
  isPublic: boolean; gameId: string; mapId: string; ownerId: string;
  owner?: { id: string; username: string };
  floors?: Array<{
    id: string; mapFloorId: string;
    mapFloor?: { id: string; name: string; floorNumber: number; imagePath: string; darkImagePath?: string | null; whiteImagePath?: string | null };
    draws?: any[];
  }>;
  operatorSlots?: Array<{ id: string; slotNumber: number; operatorId: string | null; operator?: any }>;
  voteCount?: number; userVote?: number | null;
}

export default function BattleplanViewer() {
  const { gameSlug, planId } = useParams<{ gameSlug: string; planId: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['battleplan', planId],
    queryFn: () => apiGet<{ data: BattleplanFull }>(`/battleplans/${planId}`),
  });

  const plan = data?.data;
  const isOwner = plan && userId && plan.ownerId === userId;

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [tagInput, setTagInput] = useState('');

  const updateDescMutation = useMutation({
    mutationFn: (description: string) => apiPut(`/battleplans/${planId}`, { description }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['battleplan', planId] }); setIsEditingDesc(false); toast.success('Description updated'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateNotesMutation = useMutation({
    mutationFn: (notes: string) => apiPut(`/battleplans/${planId}`, { notes }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['battleplan', planId] }); setIsEditingNotes(false); toast.success('Notes updated'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateTagsMutation = useMutation({
    mutationFn: (tags: string[]) => apiPut(`/battleplans/${planId}`, { tags }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['battleplan', planId] }); toast.success('Tags updated'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || !plan) return;
    const current = plan.tags || [];
    if (current.includes(trimmed) || current.length >= 10) return;
    updateTagsMutation.mutate([...current, trimmed]);
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    if (!plan) return;
    updateTagsMutation.mutate((plan.tags || []).filter(t => t !== tag));
  };

  const togglePublicMutation = useMutation({
    mutationFn: (isPublic: boolean) => apiPut(`/battleplans/${planId}`, { isPublic }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battleplan', planId] });
      toast.success('Visibility updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleCopy = async () => {
    try {
      await apiPost(`/battleplans/${planId}/copy`);
      toast.success('Battleplan copied to your plans!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleShare = () => {
    if (plan && !plan.isPublic && isOwner) {
      toast.error('Make the plan public first to share it.');
      return;
    }
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
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

          {isOwner && (
            <div className="flex items-center gap-2 ml-2">
              <Switch
                id="public-toggle"
                checked={plan.isPublic}
                onCheckedChange={(checked) => togglePublicMutation.mutate(checked)}
              />
              <Label htmlFor="public-toggle" className="text-xs">Public</Label>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-1 h-3 w-3" /> Share
          </Button>

          {isAuthenticated && (
            <Button variant="outline" size="sm" onClick={handleCopy}><Copy className="mr-1 h-3 w-3" /> Copy</Button>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(plan.tags || []).map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
            {isOwner && (
              <button className="ml-1 hover:text-destructive" onClick={() => removeTag(tag)}><X className="h-2 w-2" /></button>
            )}
          </Badge>
        ))}
        {isOwner && (
          <div className="flex items-center gap-1">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); addTag(tagInput); } }}
              placeholder="Add tag..."
              className="h-7 w-32 text-xs"
            />
            {SUGGESTED_TAGS.filter(t => !(plan.tags || []).includes(t)).slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="cursor-pointer text-xs opacity-60 hover:opacity-100" onClick={() => addTag(tag)}>
                + {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {(plan.description || isOwner) && (
        <Card className="mb-4">
          <CardHeader className="flex flex-row items-center justify-between py-2">
            <CardTitle className="text-sm">Description</CardTitle>
            {isOwner && !isEditingDesc && (
              <Button variant="ghost" size="sm" onClick={() => { setEditDesc(plan.description || ''); setIsEditingDesc(true); }}>
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditingDesc ? (
              <div className="space-y-2">
                <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateDescMutation.mutate(editDesc)}><Check className="h-3 w-3 mr-1" /> Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingDesc(false)}><X className="h-3 w-3 mr-1" /> Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{plan.description || <span className="text-muted-foreground italic">No description</span>}</p>
            )}
          </CardContent>
        </Card>
      )}

      {(plan.notes || isOwner) && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between py-2">
            <CardTitle className="text-sm">Notes</CardTitle>
            {isOwner && !isEditingNotes && (
              <Button variant="ghost" size="sm" onClick={() => { setEditNotes(plan.notes || ''); setIsEditingNotes(true); }}>
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditingNotes ? (
              <div className="space-y-2">
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={5} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateNotesMutation.mutate(editNotes)}><Check className="h-3 w-3 mr-1" /> Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingNotes(false)}><X className="h-3 w-3 mr-1" /> Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{plan.notes || <span className="text-muted-foreground italic">No notes</span>}</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="h-[calc(100vh-14rem)]">
        <CanvasView
          floors={plan.floors || []}
          readOnly
        />
      </div>
    </div>
  );
}
