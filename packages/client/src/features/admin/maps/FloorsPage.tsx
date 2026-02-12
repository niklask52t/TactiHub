import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft, ArrowUp, ArrowDown, Pencil } from 'lucide-react';
import { useState } from 'react';

interface Floor {
  id: string;
  mapId: string;
  name: string;
  floorNumber: number;
  imagePath: string;
}

export default function FloorsPage() {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editFloor, setEditFloor] = useState<Floor | null>(null);

  const { data } = useQuery({
    queryKey: ['admin', 'floors', mapId],
    queryFn: () => apiGet<{ data: Floor[] }>(`/admin/maps/${mapId}/floors`),
  });

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => apiPost(`/admin/maps/${mapId}/floors`, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'floors', mapId] });
      toast.success('Floor created');
      setIsOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      apiPut(`/admin/maps/${mapId}/floors/${id}`, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'floors', mapId] });
      toast.success('Floor updated');
      setEditFloor(null);
      setIsOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/maps/${mapId}/floors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'floors', mapId] });
      toast.success('Floor deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderMutation = useMutation({
    mutationFn: (order: { id: string; floorNumber: number }[]) =>
      apiPut(`/admin/maps/${mapId}/floors/reorder`, { order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'floors', mapId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (editFloor) {
      updateMutation.mutate({ id: editFloor.id, formData: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const floors = data?.data || [];

  const moveFloor = (floor: Floor, direction: 'up' | 'down') => {
    const sorted = [...floors].sort((a, b) => a.floorNumber - b.floorNumber);
    const idx = sorted.findIndex(f => f.id === floor.id);
    if (direction === 'up' && idx > 0) {
      const order = sorted.map((f, i) => {
        if (i === idx - 1) return { id: f.id, floorNumber: idx };
        if (i === idx) return { id: f.id, floorNumber: idx - 1 };
        return { id: f.id, floorNumber: i };
      });
      reorderMutation.mutate(order);
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const order = sorted.map((f, i) => {
        if (i === idx) return { id: f.id, floorNumber: idx + 1 };
        if (i === idx + 1) return { id: f.id, floorNumber: idx };
        return { id: f.id, floorNumber: i };
      });
      reorderMutation.mutate(order);
    }
  };

  const nextFloorNumber = floors.length > 0 ? Math.max(...floors.map(f => f.floorNumber)) + 1 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Floor Layouts</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setEditFloor(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Floor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editFloor ? 'Edit Floor' : 'Add Floor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Floor Name</Label>
                <Input name="name" defaultValue={editFloor?.name} placeholder="e.g. 1F, 2F, Basement, Roof" required />
              </div>
              <div className="space-y-2">
                <Label>Floor Number (order)</Label>
                <Input name="floorNumber" type="number" defaultValue={editFloor?.floorNumber ?? nextFloorNumber} required />
              </div>
              <div className="space-y-2">
                <Label>Floor Image {editFloor ? '(leave empty to keep current)' : ''}</Label>
                <Input name="image" type="file" accept="image/*" required={!editFloor} />
              </div>
              {editFloor?.imagePath && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Current Image</Label>
                  <img src={`/uploads${editFloor.imagePath}`} className="rounded-lg max-h-32 object-contain" alt="" />
                </div>
              )}
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">{editFloor ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {floors.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No floors yet. Add floor layouts to get started.</p>
      )}

      <div className="space-y-4">
        {[...floors].sort((a, b) => a.floorNumber - b.floorNumber).map((floor, idx) => (
          <Card key={floor.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => moveFloor(floor, 'up')}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === floors.length - 1} onClick={() => moveFloor(floor, 'down')}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
              <img src={`/uploads${floor.imagePath}`} className="w-48 h-32 object-contain rounded-lg border bg-muted" alt={floor.name} />
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{floor.name}</h3>
                <p className="text-sm text-muted-foreground">Floor #{floor.floorNumber}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditFloor(floor); setIsOpen(true); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => { if (confirm('Delete this floor?')) deleteMutation.mutate(floor.id); }}>
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
