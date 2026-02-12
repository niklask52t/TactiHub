import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background gaming-bg p-4 relative overflow-hidden">
      {/* Floating particles */}
      <span className="gaming-particle" style={{ left: '10%', bottom: '20%', animationDelay: '0s' }} />
      <span className="gaming-particle" style={{ left: '25%', bottom: '10%', animationDelay: '1.5s' }} />
      <span className="gaming-particle" style={{ right: '15%', bottom: '30%', animationDelay: '3s' }} />
      <span className="gaming-particle" style={{ right: '30%', bottom: '5%', animationDelay: '4.5s' }} />
      <span className="gaming-particle" style={{ left: '50%', bottom: '15%', animationDelay: '2s' }} />

      {/* Top glow line */}
      <div className="gaming-glow-line top-0 left-0" />
      {/* Bottom glow line */}
      <div className="gaming-glow-line bottom-0 right-0" style={{ animationDelay: '2s' }} />

      <div className="relative w-full max-w-md space-y-6 z-10">
        <div className="flex flex-col items-center gap-4">
          <Link to="/" className="transition-transform hover:scale-105">
            <img src="/tactihub_logo.png" alt="TactiHub" className="h-14 drop-shadow-[0_0_12px_oklch(0.68_0.19_45/0.3)]" />
          </Link>
        </div>

        {/* Gaming card wrapper with HUD corners */}
        <div className="gaming-card">
          <div className="gaming-card-corners">
            <Outlet />
          </div>
        </div>

        <div className="flex justify-center">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
