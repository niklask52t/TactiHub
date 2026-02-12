import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function ConfirmDeletionPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No token provided');
      return;
    }

    apiGet<{ message: string }>(`/auth/confirm-deletion?token=${token}`)
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Failed to confirm deletion');
      });
  }, [token]);

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <CardTitle className="tracking-wide">Account Deletion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-green-500">Account Deactivated</p>
                <p className="text-sm text-muted-foreground mt-1">{message}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Contact an administrator within 30 days if you change your mind.
            </p>
            <Button asChild>
              <Link to="/">Go to Home</Link>
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-destructive">Error</p>
                <p className="text-sm text-muted-foreground mt-1">{message}</p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/">Go to Home</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
