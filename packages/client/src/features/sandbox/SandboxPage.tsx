import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import { CanvasView } from '@/features/canvas/CanvasView';
import { Toolbar } from '@/features/canvas/tools/Toolbar';
import { IconSidebar } from '@/features/canvas/tools/IconSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ArrowLeft, AlertTriangle, Gamepad2, Search } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvas.store';
import type { OperatorSlot } from '@tactihub/shared';

interface Game {
  id: string; name: string; slug: string; icon: string | null;
}

interface MapData {
  id: string; name: string; slug: string; thumbnail: string | null;
}

interface GameWithMaps extends Game {
  maps: MapData[];
}

interface MapFloor {
  id: string; name: string; floorNumber: number; imagePath: string;
  darkImagePath?: string | null; whiteImagePath?: string | null;
}

interface MapWithFloors extends MapData {
  floors: MapFloor[];
}

export default function SandboxPage() {
  const [step, setStep] = useState<'game' | 'map' | 'canvas'>('game');
  const [selectedGame, setSelectedGame] = useState<GameWithMaps | null>(null);
  const [selectedMap, setSelectedMap] = useState<MapWithFloors | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mapSearch, setMapSearch] = useState('');

  // Local operator slots for sandbox lineup
  const slotIdCounter = useRef(0);
  const makeSlots = (side: 'defender' | 'attacker', count: number): OperatorSlot[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `sandbox-${side}-${++slotIdCounter.current}`,
      battleplanId: 'sandbox',
      slotNumber: i + 1,
      operatorId: null,
      side,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

  const [operatorSlots, setOperatorSlots] = useState<OperatorSlot[]>(() => makeSlots('defender', 5));

  const handleSlotChange = useCallback((slotId: string, operatorId: string | null) => {
    setOperatorSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, operatorId, updatedAt: new Date().toISOString() } : s))
    );
  }, []);

  const handleCreateAttackerLineup = useCallback(() => {
    setOperatorSlots((prev) => [...prev, ...makeSlots('attacker', 5)]);
  }, []);

  const handleRemoveAttackerLineup = useCallback(() => {
    setOperatorSlots((prev) => prev.filter((s) => s.side !== 'attacker'));
  }, []);

  // Local draws state (no persistence)
  const [localDraws, setLocalDraws] = useState<Record<string, any[]>>({});
  const localIdCounter = useRef(0);
  const isRedoingRef = useRef(false);
  const { pushMyDraw, popUndo, popRedo, updateDrawId, clearHistory } = useCanvasStore();

  const { data: gamesData, isLoading: gamesLoading } = useQuery({
    queryKey: ['games'],
    queryFn: () => apiGet<{ data: Game[] }>('/games'),
  });

  const { data: gameDetailData } = useQuery({
    queryKey: ['game', selectedGame?.slug],
    queryFn: () => apiGet<{ data: GameWithMaps }>(`/games/${selectedGame!.slug}`),
    enabled: !!selectedGame?.slug,
  });

  const { data: mapDetailData } = useQuery({
    queryKey: ['map', selectedGame?.slug, selectedMap?.slug],
    queryFn: () => apiGet<{ data: MapWithFloors }>(`/games/${selectedGame!.slug}/maps/${selectedMap!.slug}`),
    enabled: !!selectedGame?.slug && !!selectedMap?.slug,
  });

  const handleSelectGame = (game: Game) => {
    setSelectedGame(game as GameWithMaps);
    setStep('map');
  };

  const handleSelectMap = (map: MapData) => {
    setSelectedMap(map as MapWithFloors);
    setStep('canvas');
  };

  const handleDrawCreate = useCallback((floorId: string, draws: any[]) => {
    const newDraws = draws.map((d) => ({
      ...d,
      id: `local-${++localIdCounter.current}`,
      isLocal: true,
    }));
    setLocalDraws((prev) => ({
      ...prev,
      [floorId]: [...(prev[floorId] || []), ...newDraws],
    }));
    if (!isRedoingRef.current) {
      for (let i = 0; i < newDraws.length; i++) {
        pushMyDraw({ id: newDraws[i].id, floorId, payload: draws[i] });
      }
    }
  }, [pushMyDraw]);

  const handleDrawDelete = useCallback((drawIds: string[]) => {
    const idSet = new Set(drawIds);
    setLocalDraws((prev) => {
      const next: Record<string, any[]> = {};
      let changed = false;
      for (const [fid, draws] of Object.entries(prev)) {
        const filtered = draws.filter((d) => !idSet.has(d.id));
        if (filtered.length !== draws.length) changed = true;
        next[fid] = filtered;
      }
      return changed ? next : prev;
    });
  }, []);

  const handleDrawUpdate = useCallback((drawId: string, updates: any) => {
    setLocalDraws((prev) => {
      const next: Record<string, any[]> = {};
      let changed = false;
      for (const [fid, draws] of Object.entries(prev)) {
        next[fid] = draws.map((d) => {
          if (d.id === drawId) {
            changed = true;
            return { ...d, ...updates, data: updates.data ? { ...d.data, ...updates.data } : d.data };
          }
          return d;
        });
      }
      return changed ? next : prev;
    });
  }, []);

  const handleUndo = useCallback(() => {
    const entry = popUndo();
    if (!entry) return;
    if (entry.action === 'update') {
      handleDrawUpdate(entry.id, entry.previousState);
    } else {
      handleDrawDelete([entry.id]);
    }
  }, [popUndo, handleDrawDelete, handleDrawUpdate]);

  const handleRedo = useCallback(() => {
    const entry = popRedo();
    if (!entry) return;
    if (entry.action === 'update') {
      handleDrawUpdate(entry.id, entry.payload);
      return;
    }
    isRedoingRef.current = true;
    const newId = `local-${++localIdCounter.current}`;
    const newDraw = { ...entry.payload, id: newId, isLocal: true };
    setLocalDraws((prev) => ({
      ...prev,
      [entry.floorId]: [...(prev[entry.floorId] || []), newDraw],
    }));
    updateDrawId(entry.id, newId);
    isRedoingRef.current = false;
  }, [popRedo, updateDrawId, handleDrawUpdate]);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    if (step !== 'canvas') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, handleUndo, handleRedo]);

  // Clear canvas history on unmount
  useEffect(() => {
    return () => clearHistory();
  }, [clearHistory]);

  // Build floors for CanvasView (draws are empty — local draws passed via localDraws prop)
  const floors = (mapDetailData?.data?.floors || []).map((floor) => ({
    id: floor.id,
    mapFloorId: floor.id,
    mapFloor: floor,
    draws: [] as any[],
  }));

  if (step === 'canvas' && selectedMap) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Exit</Link>
            </Button>
            <span className="text-sm font-medium text-white">{selectedMap.name}</span>
          </div>
          <span className="text-xs text-primary flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Sandbox — drawings are not saved
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth/register">Register</Link>
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex justify-center py-2 border-b">
          <Toolbar onUndo={handleUndo} onRedo={handleRedo} />
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-hidden relative">
          {/* Icon sidebar */}
          {selectedGame?.slug && (
            <IconSidebar
              gameSlug={selectedGame.slug}
              open={sidebarOpen}
              onToggle={() => setSidebarOpen((v) => !v)}
              operatorSlots={operatorSlots}
              onSlotChange={handleSlotChange}
              onCreateAttackerLineup={handleCreateAttackerLineup}
              onRemoveAttackerLineup={handleRemoveAttackerLineup}
              isAuthenticated={true}
            />
          )}

          <div className="h-full p-4" style={{ marginLeft: selectedGame?.slug && sidebarOpen ? 280 : 0, transition: 'margin-left 0.2s ease-in-out' }}>
            {floors.length > 0 ? (
              <CanvasView
                floors={floors}
                onDrawCreate={handleDrawCreate}
                onDrawDelete={handleDrawDelete}
                onDrawUpdate={handleDrawUpdate}
                localDraws={localDraws}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Loading map floors...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'map' && selectedGame) {
    const allMaps = gameDetailData?.data?.maps || [];
    const maps = mapSearch
      ? allMaps.filter((m) => m.name.toLowerCase().includes(mapSearch.toLowerCase()))
      : allMaps;
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => { setStep('game'); setSelectedGame(null); setMapSearch(''); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-3xl font-bold">{selectedGame.name} — Choose a Map</h1>
        </div>
        <div className="relative max-w-sm mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search maps..."
            value={mapSearch}
            onChange={(e) => setMapSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {maps.map((map) => (
            <Card key={map.id} className="hover:border-primary transition-colors cursor-pointer" onClick={() => handleSelectMap(map)}>
              <CardHeader>
                {map.thumbnail ? (
                  <img src={`/uploads${map.thumbnail}`} className="w-full h-32 object-cover rounded" alt="" />
                ) : (
                  <div className="w-full h-32 bg-muted rounded flex items-center justify-center text-muted-foreground">No preview</div>
                )}
              </CardHeader>
              <CardContent><CardTitle className="text-lg">{map.name}</CardTitle></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Step: game
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Sandbox — Choose a Game</h1>
      <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary">
        <AlertTriangle className="h-4 w-4" />
        Sandbox Mode — Your drawings won't be saved. Log in to create persistent plans.
      </div>
      {gamesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gamesData?.data.map((game) => (
            <Card key={game.id} className="hover:border-primary transition-colors cursor-pointer" onClick={() => handleSelectGame(game)}>
              <CardHeader className="flex flex-row items-center gap-4">
                {game.icon ? (
                  <img src={`/uploads${game.icon}`} className="h-16 w-16 rounded-lg" alt="" />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                    <Gamepad2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <CardTitle className="text-xl">{game.name}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
