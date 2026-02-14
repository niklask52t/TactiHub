import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setNeedsVerification(false);
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
      const msg: string = err.message || 'Login failed';
      if (msg.toLowerCase().includes('verify your email')) {
        setNeedsVerification(true);
        setResendEmail(data.identifier);
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      const email = resendEmail.includes('@') ? resendEmail : '';
      if (!email) {
        toast.error('Please log in with your email address to resend verification.');
        return;
      }
      await apiPost('/auth/resend-verification', { email });
      toast.success('Verification email sent! Please check your inbox.');
    } catch {
      toast.error('Could not send verification email. Please try again later.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleCredentialsChanged = () => {
    setShowForceChange(false);
    navigate('/');
  };

  return (
    <>
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="tracking-wide">Login</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-xs uppercase tracking-wider text-muted-foreground">Email or Username</Label>
              <Input id="identifier" type="text" className="gaming-input bg-background/50 border-primary/20 focus:border-primary/50 transition-all" {...register('identifier')} />
              {errors.identifier && <p className="text-sm text-destructive">{errors.identifier.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
              <Input id="password" type="password" className="gaming-input bg-background/50 border-primary/20 focus:border-primary/50 transition-all" {...register('password')} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="gaming-btn w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:brightness-110 disabled:opacity-50 transition-all">
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <div className="flex justify-between text-sm">
              <Link to="/auth/forgot-password" className="text-primary hover:underline">
                Forgot password?
              </Link>
              <Link to="/auth/register" className="text-primary hover:underline">
                Create account
              </Link>
            </div>
            <div className="text-center text-sm">
              <Link to="/auth/magic-link" className="text-primary hover:underline">
                Login with Magic Link
              </Link>
            </div>
            {needsVerification && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Your email is not yet verified.
                </p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                >
                  {resendLoading ? 'Sending...' : 'Resend verification email'}
                </button>
              </div>
            )}
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
