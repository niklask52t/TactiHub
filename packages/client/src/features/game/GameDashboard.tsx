import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Map, FileText, Globe, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

interface GameWithMaps {
  id: string; name: string; slug: string; icon: string | null; description: string | null;
  maps: Array<{ id: string; name: string; slug: string; thumbnail: string | null; isCompetitive: boolean }>;
}

export default function GameDashboard() {
  const { gameSlug } = useParams<{ gameSlug: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data, isLoading } = useQuery({
    queryKey: ['game', gameSlug],
    queryFn: () => apiGet<{ data: GameWithMaps }>(`/games/${gameSlug}`),
  });

  const game = data?.data;

  if (isLoading) return <div className="container mx-auto p-8"><Skeleton className="h-64" /></div>;
  if (!game) return <div className="container mx-auto p-8 text-center">Game not found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" asChild><Link to="/"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex items-center gap-3">
          {game.icon && <img src={`/uploads${game.icon}`} className="h-12 w-12 rounded-lg" alt="" />}
          <div>
            <h1 className="text-3xl font-bold">{game.name}</h1>
            {game.description && <p className="text-muted-foreground">{game.description}</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        {isAuthenticated && (
          <Button asChild><Link to={`/${gameSlug}/plans`}><FileText className="mr-2 h-4 w-4" /> My Plans</Link></Button>
        )}
        <Button variant="outline" asChild><Link to={`/${gameSlug}/plans/public`}><Globe className="mr-2 h-4 w-4" /> Public Plans</Link></Button>
      </div>

      <h2 className="text-2xl font-bold mb-4">Maps</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {game.maps.map((map) => (
          <Card key={map.id} className="overflow-hidden hover:border-primary transition-colors">
            {map.thumbnail ? (
              <img src={`/uploads${map.thumbnail}`} className="w-full h-40 object-cover" alt={map.name} />
            ) : (
              <div className="w-full h-40 bg-muted flex items-center justify-center">
                <Map className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <CardContent className="p-4">
              <h3 className="font-semibold">{map.name}</h3>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
