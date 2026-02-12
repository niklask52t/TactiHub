import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPost } from '@/lib/api';
import { toast } from 'sonner';
import { useState } from 'react';

const schema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
});

type FormData = z.infer<typeof schema>;

export default function MagicLinkRequestPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await apiPost('/auth/request-magic-link', data);
      setSent(true);
      toast.success('If an account exists, a login link has been sent.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <CardTitle className="tracking-wide">Magic Link Login</CardTitle>
        <CardDescription>Enter your email or username to receive a login link</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground">Check your email for a magic login link.</p>
            <Link to="/auth/login" className="text-primary hover:underline">Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-xs uppercase tracking-wider text-muted-foreground">
                Email or Username
              </Label>
              <Input
                id="identifier"
                type="text"
                className="gaming-input bg-background/50 border-primary/20 focus:border-primary/50 transition-all"
                {...register('identifier')}
              />
              {errors.identifier && <p className="text-sm text-destructive">{errors.identifier.message}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="gaming-btn w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
            <p className="text-center text-sm">
              <Link to="/auth/login" className="text-primary hover:underline">Login with password</Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
