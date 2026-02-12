import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiGet, apiPost } from '@/lib/api';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, KeyRound, Loader2 } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';

const registerSchema = z.object({
  username: z.string().min(3, 'At least 3 characters').max(50),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
});

type RegisterData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [publicRegEnabled, setPublicRegEnabled] = useState(true);
  const [token, setToken] = useState('');
  const [tokenVerified, setTokenVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    apiGet<{ data: { registrationEnabled: boolean } }>('/auth/registration-status')
      .then((res) => {
        setPublicRegEnabled(res.data.registrationEnabled);
        if (res.data.registrationEnabled) {
          setTokenVerified(true); // No token needed
        }
      })
      .catch(() => {
        setPublicRegEnabled(true);
        setTokenVerified(true);
      })
      .finally(() => setCheckingStatus(false));

    apiGet<{ data: { siteKey: string | null } }>('/auth/recaptcha-key')
      .then((res) => { if (res.data.siteKey) setRecaptchaSiteKey(res.data.siteKey); })
      .catch(() => {});
  }, []);

  const onSubmit = async (data: RegisterData) => {
    setLoading(true);
    try {
      await apiPost('/auth/register', {
        ...data,
        token: publicRegEnabled ? undefined : token,
        captchaToken: captchaToken || undefined,
      });
      toast.success('Registration successful! Please check your email to verify your account.');
      navigate('/auth/login');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Token entry step (when public registration is disabled)
  if (!publicRegEnabled && !tokenVerified) {
    return (
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 tracking-wide">
            <KeyRound className="h-5 w-5 text-primary" />
            Registration Token Required
          </CardTitle>
          <CardDescription>
            Public registration is disabled. Enter a valid registration token to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-token" className="text-xs uppercase tracking-wider text-muted-foreground">Registration Token</Label>
              <Input
                id="reg-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your token here"
                className="gaming-input bg-background/50 border-primary/20 focus:border-primary/50 transition-all font-mono"
              />
            </div>
            <button
              className="gaming-btn w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:brightness-110 disabled:opacity-50 transition-all"
              disabled={!token.trim()}
              onClick={() => {
                if (token.trim()) setTokenVerified(true);
              }}
            >
              Continue
            </button>
            <p className="text-center text-sm">
              Already have an account?{' '}
              <Link to="/auth/login" className="text-primary hover:underline">Login</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Registration form
  return (
    <Card className="border-primary/10">
      <CardHeader>
        <CardTitle className="tracking-wide">Create Account</CardTitle>
        <CardDescription>Register to start creating battle plans</CardDescription>
      </CardHeader>
      <CardContent>
        {!publicRegEnabled && (
          <button
            type="button"
            onClick={() => setTokenVerified(false)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Change token
          </button>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-xs uppercase tracking-wider text-muted-foreground">Username</Label>
            <Input id="username" className="gaming-input bg-background/50 border-primary/20 focus:border-primary/50 transition-all" {...register('username')} />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input id="email" type="email" className="gaming-input bg-background/50 border-primary/20 focus:border-primary/50 transition-all" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
            <Input id="password" type="password" className="gaming-input bg-background/50 border-primary/20 focus:border-primary/50 transition-all" {...register('password')} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          {recaptchaSiteKey && (
            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={recaptchaSiteKey}
                theme="dark"
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>
          )}
          <button type="submit" disabled={loading || (!!recaptchaSiteKey && !captchaToken)} className="gaming-btn w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:brightness-110 disabled:opacity-50 transition-all">
            {loading ? 'Creating account...' : 'Register'}
          </button>
          <p className="text-center text-sm">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-primary hover:underline">Login</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
