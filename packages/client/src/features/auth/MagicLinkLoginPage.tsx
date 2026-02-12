import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function MagicLinkLoginPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No token provided');
      return;
    }

    apiGet<{ data: { user: any; accessToken: string } }>(`/auth/magic-login?token=${token}`)
      .then((res) => {
        setAuth(res.data.user, res.data.accessToken);
        toast.success('Welcome back!');
        navigate('/');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Invalid or expired magic link');
      });
  }, [token]);

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <CardTitle className="tracking-wide">Magic Link Login</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-destructive">Login Failed</p>
                <p className="text-sm text-muted-foreground mt-1">{message}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/auth/login">Back to Login</Link>
              </Button>
              <Button asChild>
                <Link to="/auth/magic-link">Try Again</Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
