import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut, apiDelete } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Shield, Trash2, CheckCircle, RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface UserData {
  id: string; username: string; email: string; role: string;
  emailVerifiedAt: string | null; createdAt: string;
  deactivatedAt: string | null; deletionScheduledAt: string | null;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [verifyUser, setVerifyUser] = useState<UserData | null>(null);

  const { data } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => apiGet<{ data: UserData[]; total: number }>('/admin/users'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => apiPut(`/admin/users/${id}/role`, { role }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('Role updated'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => apiPut(`/admin/users/${id}/verify`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User verified successfully. Notification email sent.');
      setVerifyUser(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/users/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('User deleted'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => apiPut(`/admin/users/${id}/reactivate`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('User reactivated'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const getDaysLeft = (deletionScheduledAt: string | null) => {
    if (!deletionScheduledAt) return null;
    return Math.max(0, Math.ceil((new Date(deletionScheduledAt).getTime() - Date.now()) / 86400000));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Users</h1>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left font-medium text-muted-foreground p-4">Username</th>
              <th className="text-left font-medium text-muted-foreground p-4">Email</th>
              <th className="text-left font-medium text-muted-foreground p-4">Role</th>
              <th className="text-left font-medium text-muted-foreground p-4">Status</th>
              <th className="text-left font-medium text-muted-foreground p-4">Verified</th>
              <th className="text-right font-medium text-muted-foreground p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((user) => {
              const isSelf = user.id === currentUser?.id;
              const daysLeft = getDaysLeft(user.deletionScheduledAt);

              return (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-4 font-medium">
                    {user.username}
                    {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                  </td>
                  <td className="p-4 text-muted-foreground">{user.email}</td>
                  <td className="p-4">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                  </td>
                  <td className="p-4">
                    {user.deactivatedAt ? (
                      <Badge variant="destructive">
                        Deactivated{daysLeft !== null && ` (${daysLeft}d left)`}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </td>
                  <td className="p-4">
                    <Badge variant={user.emailVerifiedAt ? 'default' : 'destructive'}>
                      {user.emailVerifiedAt ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      {!user.emailVerifiedAt && !user.deactivatedAt && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Verify user" onClick={() => setVerifyUser(user)}>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                      {user.deactivatedAt && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Reactivate user" onClick={() => reactivateMutation.mutate(user.id)}>
                          <RotateCcw className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                      {!isSelf && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Toggle role" onClick={() => {
                            const newRole = user.role === 'admin' ? 'user' : 'admin';
                            roleMutation.mutate({ id: user.id, role: newRole });
                          }}>
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Delete user" onClick={() => { if (confirm('Permanently delete this user and all their data?')) deleteMutation.mutate(user.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data?.data.length === 0 && (
          <p className="p-4 text-center text-muted-foreground">No users found</p>
        )}
      </div>

      {/* Double-confirmation verify dialog */}
      <Dialog open={!!verifyUser} onOpenChange={(open) => { if (!open) setVerifyUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manually Verify User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to manually verify <strong className="text-foreground">{verifyUser?.username}</strong> ({verifyUser?.email})?
            </p>
            <p className="text-sm text-muted-foreground">
              This will mark their email as verified without them clicking the verification link. A notification email will be sent to the user.
            </p>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-medium text-destructive">This action cannot be undone.</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="default"
              disabled={verifyMutation.isPending}
              onClick={() => { if (verifyUser) verifyMutation.mutate(verifyUser.id); }}
            >
              {verifyMutation.isPending ? 'Verifying...' : 'Yes, Verify User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
