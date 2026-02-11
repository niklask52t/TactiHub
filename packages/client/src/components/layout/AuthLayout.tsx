import { Outlet, Link } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold">
            <Gamepad2 className="h-8 w-8 text-primary" />
            StratHub
          </Link>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
