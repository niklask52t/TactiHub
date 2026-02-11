import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Gamepad2, LogOut, User, Shield } from 'lucide-react';
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <Gamepad2 className="h-6 w-6 text-primary" />
            StratHub
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
                <Button asChild>
                  <Link to="/auth/register">Register</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
