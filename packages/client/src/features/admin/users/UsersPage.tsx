import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Trash2 } from 'lucide-react';

interface UserData {
  id: string; username: string; email: string; role: string;
  emailVerifiedAt: string | null; createdAt: string;
}

export default function UsersPage() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => apiGet<{ data: UserData[]; total: number }>('/admin/users'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => apiPut(`/admin/users/${id}/role`, { role }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('Role updated'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/users/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('User deleted'); },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Users</h1>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 p-4 border-b font-medium text-sm text-muted-foreground">
          <div>Username</div>
          <div>Email</div>
          <div>Role</div>
          <div>Verified</div>
          <div>Actions</div>
        </div>
        {data?.data.map((user) => (
          <div key={user.id} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 p-4 border-b last:border-0 items-center">
            <div className="font-medium">{user.username}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
            <Badge variant={user.emailVerifiedAt ? 'default' : 'destructive'}>
              {user.emailVerifiedAt ? 'Yes' : 'No'}
            </Badge>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => {
                const newRole = user.role === 'admin' ? 'user' : 'admin';
                roleMutation.mutate({ id: user.id, role: newRole });
              }}>
                <Shield className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this user?')) deleteMutation.mutate(user.id); }}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
