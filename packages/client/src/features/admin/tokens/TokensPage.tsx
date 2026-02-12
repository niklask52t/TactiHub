import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Copy, Info } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface Token {
  id: string; token: string; createdBy: string; usedBy: string | null;
  usedAt: string | null; expiresAt: string; createdAt: string;
}

interface Settings {
  registrationEnabled: boolean;
}

export default function TokensPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [days, setDays] = useState(7);

  const { data: settingsData } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => apiGet<{ data: Settings }>('/admin/settings'),
  });

  const publicRegEnabled = settingsData?.data.registrationEnabled ?? true;

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
          <DialogTrigger asChild>
            <Button disabled={publicRegEnabled}>
              <Plus className="mr-2 h-4 w-4" /> Create Tokens
            </Button>
          </DialogTrigger>
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

      {publicRegEnabled && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <p>Public registration is enabled. Tokens are not required. Disable public registration in <Link to="/admin/settings" className="text-primary underline">Settings</Link> to use token-based registration.</p>
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left font-medium text-muted-foreground p-4">Token</th>
              <th className="text-left font-medium text-muted-foreground p-4">Status</th>
              <th className="text-left font-medium text-muted-foreground p-4">Expires</th>
              <th className="text-right font-medium text-muted-foreground p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((token) => (
              <tr key={token.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-4">
                  <code className="text-sm font-mono">{token.token}</code>
                </td>
                <td className="p-4">
                  <Badge variant={token.usedBy ? 'secondary' : new Date(token.expiresAt) < new Date() ? 'destructive' : 'default'}>
                    {token.usedBy ? 'Used' : new Date(token.expiresAt) < new Date() ? 'Expired' : 'Available'}
                  </Badge>
                </td>
                <td className="p-4 text-muted-foreground">{new Date(token.expiresAt).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToken(token.token)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(token.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.data.length === 0 && (
          <p className="p-4 text-center text-muted-foreground">No tokens created yet</p>
        )}
      </div>
    </div>
  );
}
