import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { LogOut, User, Shield, Settings } from 'lucide-react';
import { APP_VERSION } from '@tactihub/shared';
import { apiPost } from '@/lib/api';

export function AppLayout() {
  const { user, isAdmin, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiPost('/auth/logout');
    } catch {
      // Continue even if request fails
    }
    logout();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-background gaming-bg relative overflow-x-hidden">
      {/* Glow line */}
      <div className="gaming-glow-line top-0 left-0 z-50" />

      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 w-full">
          <Link to="/" className="flex items-center transition-transform hover:scale-105">
            <img src="/tactihub_logo.png" alt="TactiHub" className="h-10 drop-shadow-[0_0_8px_oklch(0.68_0.19_45/0.3)]" />
          </Link>

          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <User className="h-4 w-4" />
                    {user.username}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="h-4 w-4 mr-2" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/account')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" asChild>
                  <Link to="/auth/login">Login</Link>
                </Button>
                <Button asChild className="gaming-btn">
                  <Link to="/auth/register">Register</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t py-4">
        <div className="container flex items-center justify-between px-4 text-xs text-muted-foreground">
          <span>TactiHub v{APP_VERSION} &mdash; by Niklas Kronig</span>
          <div className="flex items-center gap-4">
            <Link to="/help" className="hover:text-primary transition-colors">Help</Link>
            <Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link>
            <Link to="/changelog" className="hover:text-primary transition-colors">Changelog</Link>
            <Link to="/impressum" className="hover:text-primary transition-colors">Impressum</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
