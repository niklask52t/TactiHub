import { Outlet, Link } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Link to="/">
            <img src="/strathub_logo.png" alt="StratHub" className="h-10" />
          </Link>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
