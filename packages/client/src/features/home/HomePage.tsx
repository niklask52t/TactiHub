import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Users, Gamepad2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

interface Game {
  id: string; name: string; slug: string; icon: string | null; description: string | null;
}

export default function HomePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data, isLoading } = useQuery({
    queryKey: ['games'],
    queryFn: () => apiGet<{ data: Game[] }>('/games'),
  });

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center mb-4">
          <img src="/strathub_logo.png" alt="StratHub" className="h-16" />
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Collaborative strategy planning for competitive games. Draw tactics, share plans, and coordinate with your team in real-time.
        </p>
        <div className="flex items-center justify-center gap-4">
          {isAuthenticated ? (
            <Button size="lg" asChild>
              <Link to="/room/create"><Users className="mr-2 h-5 w-5" /> Create Room</Link>
            </Button>
          ) : (
            <>
              <Button size="lg" asChild>
                <Link to="/auth/register">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth/login">Login</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Games Grid */}
      <h2 className="text-2xl font-bold mb-6">Choose a Game</h2>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.data.map((game) => (
            <Link key={game.id} to={`/${game.slug}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center gap-4">
                  {game.icon ? (
                    <img src={`/uploads${game.icon}`} className="h-16 w-16 rounded-lg" alt="" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                      <Gamepad2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-xl">{game.name}</CardTitle>
                    {game.description && <p className="text-sm text-muted-foreground mt-1">{game.description}</p>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-primary text-sm font-medium">
                    Browse Maps <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
