import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiGet } from '@/lib/api';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function ConfirmEmailChangePage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No token provided');
      return;
    }

    apiGet<{ message: string }>(`/auth/confirm-email-change?token=${token}`)
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err: any) => {
        setStatus('error');
        setMessage(err.message || 'Failed to confirm email change');
      });
  }, [token]);

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <CardTitle className="tracking-wide">Email Change</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Confirming email change...</p>
          </div>
        )}
        {status === 'success' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <p className="text-foreground">{message}</p>
            <Link to="/auth/login" className="text-primary hover:underline text-sm">
              Go to Login
            </Link>
          </div>
        )}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <XCircle className="h-8 w-8 text-destructive" />
            <p className="text-foreground">{message}</p>
            <Link to="/" className="text-primary hover:underline text-sm">
              Back to Homepage
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
