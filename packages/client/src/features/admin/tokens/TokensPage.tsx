import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Copy } from 'lucide-react';
import { useState } from 'react';

interface Token {
  id: string; token: string; createdBy: string; usedBy: string | null;
  usedAt: string | null; expiresAt: string; createdAt: string;
}

export default function TokensPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [days, setDays] = useState(7);

  const { data } = useQuery({
    queryKey: ['admin', 'tokens'],
    queryFn: () => apiGet<{ data: Token[] }>('/admin/tokens'),
  });

  const createMutation = useMutation({
    mutationFn: () => apiPost('/admin/tokens', { count, expiresInDays: days }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'tokens'] }); toast.success(`${count} token(s) created`); setIsOpen(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/tokens/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'tokens'] }); toast.success('Token deleted'); },
  });

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success('Token copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Registration Tokens</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Create Tokens</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Registration Tokens</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Number of tokens</Label>
                <Input type="number" min={1} max={50} value={count} onChange={(e) => setCount(parseInt(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Expires in (days)</Label>
                <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(parseInt(e.target.value))} />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={() => createMutation.mutate()}>Create</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 p-4 border-b font-medium text-sm text-muted-foreground">
          <div>Token</div>
          <div>Status</div>
          <div>Expires</div>
          <div>Actions</div>
        </div>
        {data?.data.map((token) => (
          <div key={token.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 p-4 border-b last:border-0 items-center">
            <code className="text-sm font-mono">{token.token}</code>
            <Badge variant={token.usedBy ? 'secondary' : new Date(token.expiresAt) < new Date() ? 'destructive' : 'default'}>
              {token.usedBy ? 'Used' : new Date(token.expiresAt) < new Date() ? 'Expired' : 'Available'}
            </Badge>
            <span className="text-sm text-muted-foreground">{new Date(token.expiresAt).toLocaleDateString()}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => copyToken(token.token)}><Copy className="h-3 w-3" /></Button>
              <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(token.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
