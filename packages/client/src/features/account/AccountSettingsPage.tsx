import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useMutation } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertTriangle, Mail } from 'lucide-react';
export default function AccountSettingsPage() {
  const { user } = useAuthStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailChangePassword, setEmailChangePassword] = useState('');

  const emailChangeMutation = useMutation({
    mutationFn: () => apiPost('/auth/request-email-change', {
      currentEmail,
      newEmail,
      password: emailChangePassword,
    }),
    onSuccess: (res: any) => {
      toast.success(res.message || 'Verification email sent to your new address.');
      setCurrentEmail('');
      setNewEmail('');
      setEmailChangePassword('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deletionMutation = useMutation({
    mutationFn: () => apiPost('/auth/request-deletion', { username: confirmUsername }),
    onSuccess: () => {
      toast.success('Deletion confirmation email sent. Check your inbox.');
      setShowConfirmDialog(false);
      setConfirmUsername('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Username</span>
            <span className="font-medium">{user.username}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium capitalize">{user.role}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Member since</span>
            <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Change Email Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            A verification email will be sent to the new address. Your email will only change after you click the confirmation link.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              emailChangeMutation.mutate();
            }}
            className="space-y-3"
          >
            <div className="space-y-1">
              <Label htmlFor="current-email" className="text-xs uppercase tracking-wider text-muted-foreground">Current Email</Label>
              <Input
                id="current-email"
                type="email"
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
                placeholder={user.email}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-email" className="text-xs uppercase tracking-wider text-muted-foreground">New Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email-change-password" className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
              <Input
                id="email-change-password"
                type="password"
                value={emailChangePassword}
                onChange={(e) => setEmailChangePassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={emailChangeMutation.isPending || !currentEmail || !newEmail || !emailChangePassword}
            >
              {emailChangeMutation.isPending ? 'Sending...' : 'Request Email Change'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {user.role !== 'admin' && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Deleting your account is irreversible after the 30-day grace period.
              All your battle plans, drawings, and rooms will be permanently deleted.
            </p>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              Delete Account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* First Dialog: Are you sure? */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete your account? This will:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>Deactivate your account immediately</li>
              <li>Schedule permanent deletion after 30 days</li>
              <li>Delete all your battle plans, drawings, and rooms</li>
            </ul>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm text-muted-foreground">
                You can contact an administrator within 30 days to reactivate your account.
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={() => {
              setShowDeleteDialog(false);
              setShowConfirmDialog(true);
            }}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Second Dialog: Type username to confirm */}
      <Dialog open={showConfirmDialog} onOpenChange={(open) => {
        if (!open) { setShowConfirmDialog(false); setConfirmUsername(''); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Account Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Type your username <strong className="text-foreground">{user.username}</strong> to confirm:
            </p>
            <Input
              value={confirmUsername}
              onChange={(e) => setConfirmUsername(e.target.value)}
              placeholder="Enter your username"
            />
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">
                A confirmation email will be sent. Click the link in the email to complete the deactivation.
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={confirmUsername !== user.username || deletionMutation.isPending}
              onClick={() => deletionMutation.mutate()}
            >
              {deletionMutation.isPending ? 'Sending...' : 'Send Deletion Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
