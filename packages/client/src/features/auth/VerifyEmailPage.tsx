import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiGet<{ message: string }>(`/auth/verify-email?token=${token}`)
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed');
      });
  }, [token]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Verification</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Verifying your email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p>{message}</p>
            <Button asChild>
              <Link to="/auth/login">Go to Login</Link>
            </Button>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="text-destructive">{message}</p>
            <Button variant="outline" asChild>
              <Link to="/auth/login">Back to Login</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
