import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Map, Users, Crosshair } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Game {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
}

export default function GamesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['admin', 'games'],
    queryFn: () => apiGet<{ data: Game[] }>('/admin/games'),
  });

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => apiPost<{ data: Game }>('/admin/games', formData),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'games'] }); toast.success('Game created'); setIsOpen(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) => apiPut<{ data: Game }>(`/admin/games/${id}`, formData),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'games'] }); toast.success('Game updated'); setIsOpen(false); setEditGame(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/games/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'games'] }); toast.success('Game deleted'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    // Radix Switch sends "on" when checked, nothing when unchecked — normalize to "true"/"false"
    form.set('isActive', form.has('isActive') && form.get('isActive') ? 'true' : 'false');
    if (editGame) {
      updateMutation.mutate({ id: editGame.id, formData: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Games</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setEditGame(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Game</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editGame ? 'Edit Game' : 'Add Game'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" defaultValue={editGame?.name} required />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input name="slug" defaultValue={editGame?.slug} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea name="description" defaultValue={editGame?.description || ''} />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Input name="icon" type="file" accept="image/*" />
              </div>
              <div className="flex items-center gap-2">
                <Switch name="isActive" defaultChecked={editGame?.isActive ?? true} />
                <Label>Active</Label>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">{editGame ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.data.map((game) => (
          <Card key={game.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                {game.icon && <img src={`/uploads${game.icon}`} className="h-10 w-10 rounded" alt="" />}
                <div>
                  <CardTitle className="text-lg">{game.name}</CardTitle>
                  <Badge variant={game.isActive ? 'default' : 'secondary'}>
                    {game.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {game.description && <p className="text-sm text-muted-foreground">{game.description}</p>}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/games/${game.id}/maps`)}>
                  <Map className="mr-1 h-3 w-3" /> Maps
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/games/${game.id}/operators`)}>
                  <Users className="mr-1 h-3 w-3" /> Operators
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/games/${game.id}/gadgets`)}>
                  <Crosshair className="mr-1 h-3 w-3" /> Gadgets
                </Button>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="ghost" size="sm" onClick={() => { setEditGame(game); setIsOpen(true); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this game?')) deleteMutation.mutate(game.id); }}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
