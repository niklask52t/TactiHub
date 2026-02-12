import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

interface Operator {
  id: string; name: string; icon: string | null; color: string; isAttacker: boolean; gameId: string;
}

export default function OperatorsPage() {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['admin', 'operators', gameId],
    queryFn: () => apiGet<{ data: Operator[] }>(`/admin/games/${gameId}/operators`),
  });

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => apiPost(`/admin/games/${gameId}/operators`, formData),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'operators', gameId] }); toast.success('Operator created'); setIsOpen(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/games/${gameId}/operators/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'operators', gameId] }); toast.success('Operator deleted'); },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    // Radix Switch sends "on" when checked, nothing when unchecked — normalize to "true"/"false"
    form.set('isAttacker', form.has('isAttacker') && form.get('isAttacker') ? 'true' : 'false');
    createMutation.mutate(form);
  };

  const attackers = data?.data.filter(o => o.isAttacker) || [];
  const defenders = data?.data.filter(o => !o.isAttacker) || [];

  const OpCard = ({ op }: { op: Operator }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted">
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: op.color }}>
        {op.icon ? <img src={`/uploads${op.icon}`} className="w-6 h-6" alt="" /> : <span className="text-xs font-bold text-white">{op.name[0]}</span>}
      </div>
      <span className="flex-1 font-medium">{op.name}</span>
      <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(op.id); }}>
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin/games')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-3xl font-bold">Operators</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Operator</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Operator</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
              <div className="space-y-2"><Label>Color</Label><Input name="color" type="color" defaultValue="#FF0000" /></div>
              <div className="space-y-2"><Label>Icon</Label><Input name="icon" type="file" accept="image/*" /></div>
              <div className="flex items-center gap-2"><Switch name="isAttacker" defaultChecked /><Label>Attacker</Label></div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="attackers">
        <TabsList>
          <TabsTrigger value="attackers">Attackers ({attackers.length})</TabsTrigger>
          <TabsTrigger value="defenders">Defenders ({defenders.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="attackers" className="space-y-2 mt-4">
          {attackers.map(op => <OpCard key={op.id} op={op} />)}
        </TabsContent>
        <TabsContent value="defenders" className="space-y-2 mt-4">
          {defenders.map(op => <OpCard key={op.id} op={op} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
