import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import { apiPost } from '@/lib/api';
import { toast } from 'sonner';
import { useState } from 'react';
import { DEFAULT_ADMIN_EMAIL } from '@tactihub/shared';
import ForceCredentialsModal from './ForceCredentialsModal';

const schema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [showForceChange, setShowForceChange] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await apiPost<{ data: { user: any; accessToken: string } }>('/auth/login', data);
      setAuth(res.data.user, res.data.accessToken);

      // Check if using default credentials
      if (res.data.user.email === DEFAULT_ADMIN_EMAIL) {
        setLoginPassword(data.password);
        setShowForceChange(true);
      } else {
        toast.success('Welcome back!');
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsChanged = () => {
    setShowForceChange(false);
    navigate('/');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or Username</Label>
              <Input id="identifier" type="text" {...register('identifier')} />
              {errors.identifier && <p className="text-sm text-destructive">{errors.identifier.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            <div className="flex justify-between text-sm">
              <Link to="/auth/forgot-password" className="text-primary hover:underline">
                Forgot password?
              </Link>
              <Link to="/auth/register" className="text-primary hover:underline">
                Create account
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {showForceChange && (
        <ForceCredentialsModal
          currentPassword={loginPassword}
          onComplete={handleCredentialsChanged}
        />
      )}
    </>
  );
}
