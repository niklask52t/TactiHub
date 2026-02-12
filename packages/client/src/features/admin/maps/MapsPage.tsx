import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowLeft, Layers } from 'lucide-react';
import { useState } from 'react';

interface MapData {
  id: string; name: string; slug: string; thumbnail: string | null;
  isCompetitive: boolean; isActive: boolean; gameId: string;
}

export default function MapsPage() {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editMap, setEditMap] = useState<MapData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['admin', 'maps', gameId],
    queryFn: () => apiGet<{ data: MapData[] }>(`/admin/games/${gameId}/maps`),
  });

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => apiPost(`/admin/games/${gameId}/maps`, formData),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'maps', gameId] }); toast.success('Map created'); setIsOpen(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) => apiPut(`/admin/games/${gameId}/maps/${id}`, formData),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'maps', gameId] }); toast.success('Map updated'); setIsOpen(false); setEditMap(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/games/${gameId}/maps/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'maps', gameId] }); toast.success('Map deleted'); },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    // Radix Switch sends "on" when checked, nothing when unchecked — normalize to "true"/"false"
    form.set('isCompetitive', form.has('isCompetitive') && form.get('isCompetitive') ? 'true' : 'false');
    form.set('isActive', form.has('isActive') && form.get('isActive') ? 'true' : 'false');
    if (editMap) {
      updateMutation.mutate({ id: editMap.id, formData: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin/games')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-3xl font-bold">Maps</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setEditMap(null); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Map</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editMap ? 'Edit Map' : 'Add Map'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input name="name" defaultValue={editMap?.name} required /></div>
              <div className="space-y-2"><Label>Slug</Label><Input name="slug" defaultValue={editMap?.slug} required /></div>
              <div className="space-y-2"><Label>Thumbnail</Label><Input name="thumbnail" type="file" accept="image/*" /></div>
              <div className="flex items-center gap-2"><Switch name="isCompetitive" defaultChecked={editMap?.isCompetitive ?? true} /><Label>Competitive</Label></div>
              <div className="flex items-center gap-2"><Switch name="isActive" defaultChecked={editMap?.isActive ?? true} /><Label>Active</Label></div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">{editMap ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.data.map((map) => (
          <Card key={map.id}>
            <CardHeader>
              {map.thumbnail && <img src={`/uploads${map.thumbnail}`} className="rounded-lg w-full h-40 object-cover" alt={map.name} />}
              <CardTitle className="text-lg">{map.name}</CardTitle>
              <div className="flex gap-2">
                {map.isCompetitive && <Badge>Competitive</Badge>}
                <Badge variant={map.isActive ? 'default' : 'secondary'}>{map.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/admin/maps/${map.id}/floors`)}>
                <Layers className="mr-1 h-3 w-3" /> Floors
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setEditMap(map); setIsOpen(true); }}><Pencil className="h-3 w-3" /></Button>
              <Button variant="outline" size="sm" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(map.id); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
