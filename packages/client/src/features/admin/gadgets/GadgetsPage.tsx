import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

interface Gadget {
  id: string; name: string; icon: string | null; category: string; gameId: string;
}

export default function GadgetsPage() {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['admin', 'gadgets', gameId],
    queryFn: () => apiGet<{ data: Gadget[] }>(`/admin/games/${gameId}/gadgets`),
  });

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => apiPost(`/admin/games/${gameId}/gadgets`, formData),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'gadgets', gameId] }); toast.success('Gadget created'); setIsOpen(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/games/${gameId}/gadgets/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'gadgets', gameId] }); toast.success('Gadget deleted'); },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createMutation.mutate(new FormData(e.currentTarget));
  };

  const categories = ['unique', 'secondary', 'general'];
  const grouped = Object.fromEntries(categories.map(c => [c, data?.data.filter(g => g.category === c) || []]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin/games')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-3xl font-bold">Gadgets</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Gadget</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Gadget</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select name="category" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                  <option value="unique">Unique</option>
                  <option value="secondary">Secondary</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div className="space-y-2"><Label>Icon</Label><Input name="icon" type="file" accept="image/*" /></div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="unique">
        <TabsList>
          {categories.map(c => (
            <TabsTrigger key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)} ({grouped[c]?.length || 0})</TabsTrigger>
          ))}
        </TabsList>
        {categories.map(c => (
          <TabsContent key={c} value={c} className="space-y-2 mt-4">
            {grouped[c]?.map(gadget => (
              <div key={gadget.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted">
                {gadget.icon && <img src={`/uploads${gadget.icon}`} className="w-6 h-6" alt="" />}
                <span className="flex-1 font-medium">{gadget.name}</span>
                <Badge variant="secondary">{gadget.category}</Badge>
                <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(gadget.id); }}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
