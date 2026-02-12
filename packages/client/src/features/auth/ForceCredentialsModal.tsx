import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPost } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';
import { useState } from 'react';
import { Shield } from 'lucide-react';
import type { User } from '@tactihub/shared';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm your password'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

interface Props {
  currentPassword: string;
  onComplete: () => void;
}

export default function ForceCredentialsModal({ currentPassword, onComplete }: Props) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await apiPost<{ data: User }>('/auth/change-credentials', {
        currentPassword,
        email: data.email,
        password: data.password,
      });
      setAuth(res.data, accessToken!);
      toast.success('Credentials updated successfully!');
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative animate-fade-in-up w-full max-w-md mx-4">
        {/* Outer glow border */}
        <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-primary/60 via-primary/20 to-primary/60 animate-border-glow" />

        {/* Scan line effect */}
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div
            className="absolute inset-x-0 h-8 bg-gradient-to-b from-primary/5 to-transparent"
            style={{ animation: 'scan-line 4s linear infinite' }}
          />
        </div>

        {/* Content */}
        <div className="relative bg-card rounded-xl p-6 space-y-6 border border-primary/20">
          {/* Shimmer overlay */}
          <div className="absolute inset-0 rounded-xl animate-shimmer pointer-events-none" />

          {/* Header */}
          <div className="relative text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/30 animate-pulse-glow">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold tracking-wide text-foreground">
              SECURE YOUR ACCOUNT
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You're using default credentials. Set a new email and password to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fc-email" className="text-xs uppercase tracking-wider text-muted-foreground">
                New Email
              </Label>
              <Input
                id="fc-email"
                type="email"
                placeholder="your@email.com"
                className="gaming-input bg-background/50 border-primary/20 focus:border-primary/50 transition-all"
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fc-password" className="text-xs uppercase tracking-wider text-muted-foreground">
                New Password
              </Label>
              <Input
                id="fc-password"
                type="password"
                placeholder="Min. 8 characters"
                className="gaming-input bg-background/50 border-primary/20 focus:border-primary/50 transition-all"
                {...register('password')}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fc-confirm" className="text-xs uppercase tracking-wider text-muted-foreground">
                Confirm Password
              </Label>
              <Input
                id="fc-confirm"
                type="password"
                placeholder="Repeat password"
                className="gaming-input bg-background/50 border-primary/20 focus:border-primary/50 transition-all"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="gaming-btn w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {loading ? 'Updating...' : 'Lock In'}
            </button>
          </form>

          {/* Bottom accent line */}
          <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>
      </div>
    </div>
  );
}
