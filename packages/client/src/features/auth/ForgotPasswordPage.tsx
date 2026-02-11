import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPost } from '@/lib/api';
import { toast } from 'sonner';
import { useState } from 'react';

const schema = z.object({ email: z.string().email('Invalid email') });

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setLoading(true);
    try {
      await apiPost('/auth/forgot-password', data);
      setSent(true);
      toast.success('If an account exists, a reset link has been sent.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot Password</CardTitle>
        <CardDescription>Enter your email to receive a reset link</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground">Check your email for a password reset link.</p>
            <Link to="/auth/login" className="text-primary hover:underline">Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <p className="text-center text-sm">
              <Link to="/auth/login" className="text-primary hover:underline">Back to Login</Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
