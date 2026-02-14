import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="relative overflow-hidden">
      {/* Floating particles */}
      <span className="gaming-particle" style={{ left: '5%', bottom: '30%', animationDelay: '0s' }} />
      <span className="gaming-particle" style={{ left: '15%', bottom: '10%', animationDelay: '1.5s' }} />
      <span className="gaming-particle" style={{ right: '10%', bottom: '25%', animationDelay: '3s' }} />
      <span className="gaming-particle" style={{ right: '25%', bottom: '5%', animationDelay: '4.5s' }} />
      <span className="gaming-particle" style={{ left: '50%', bottom: '15%', animationDelay: '2s' }} />
      <span className="gaming-particle" style={{ left: '70%', bottom: '35%', animationDelay: '5s' }} />

      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Hero */}
        <div className="text-center mb-20">
          <div className="flex items-center justify-center mb-6">
            <img src="/tactihub_logo.png" alt="TactiHub" className="h-20 drop-shadow-[0_0_20px_oklch(0.68_0.19_45/0.4)]" />
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Collaborative strategy planning for Rainbow Six Siege. Draw tactics, share plans, and coordinate with your team in real-time.
          </p>
          <div className="flex items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link to="/room/create" className="gaming-btn px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:brightness-110 transition-all inline-flex items-center gap-2">
                <Users className="h-5 w-5" /> Create Room
              </Link>
            ) : (
              <>
                <Link to="/auth/register" className="gaming-btn px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:brightness-110 transition-all">
                  Get Started
                </Link>
                <Link to="/auth/login" className="px-8 py-3 rounded-lg border border-primary/30 text-foreground font-semibold tracking-wide uppercase text-sm hover:border-primary/60 hover:bg-primary/5 transition-all">
                  Login
                </Link>
                <Link to="/sandbox" className="px-8 py-3 rounded-lg text-muted-foreground font-medium text-sm hover:text-primary transition-all">
                  Try Without Login
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Games Grid */}
        <h2 className="text-2xl font-bold mb-6 tracking-wide uppercase text-sm text-muted-foreground text-center">Choose a Game</h2>
        {isLoading ? (
          <div className="flex flex-wrap justify-center gap-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]" />)}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6">
            {data?.data.map((game) => (
              <Link key={game.id} to={`/${game.slug}`} className="w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]">
                <div className="gaming-card">
                  <div className="gaming-card-corners">
                    <Card className="hover:border-primary/40 transition-all cursor-pointer h-full border-primary/10 bg-card/80">
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
                        <div className="flex items-center text-primary text-sm font-medium tracking-wide">
                          Browse Maps <ArrowRight className="ml-1 h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
