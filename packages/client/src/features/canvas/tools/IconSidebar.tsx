import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { useCanvasStore } from '@/stores/canvas.store';
import { Tool } from '@tactihub/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface Operator {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  isAttacker: boolean;
}

interface Gadget {
  id: string;
  name: string;
  icon: string | null;
  category: string;
}

interface IconSidebarProps {
  gameSlug: string;
  open: boolean;
  onToggle: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  unique: '#fd7100',
  secondary: '#3A6082',
  general: '#539D9B',
};

function getGadgetAbbrev(name: string): string {
  const words = name.split(/[\s-]+/);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function IconSidebar({ gameSlug, open, onToggle }: IconSidebarProps) {
  const { selectedIcon, setSelectedIcon, setTool } = useCanvasStore();
  const [search, setSearch] = useState('');
  const [hasBeenSeen, setHasBeenSeen] = useState(() =>
    sessionStorage.getItem('iconSidebarSeen') === 'true'
  );

  const handleToggle = () => {
    if (!hasBeenSeen) {
      setHasBeenSeen(true);
      sessionStorage.setItem('iconSidebarSeen', 'true');
    }
    onToggle();
  };

  const { data: operatorsData } = useQuery({
    queryKey: ['operators', gameSlug],
    queryFn: () => apiGet<{ data: Operator[] }>(`/games/${gameSlug}/operators`),
    enabled: !!gameSlug,
  });

  const { data: gadgetsData } = useQuery({
    queryKey: ['gadgets', gameSlug],
    queryFn: () => apiGet<{ data: Gadget[] }>(`/games/${gameSlug}/gadgets`),
    enabled: !!gameSlug,
  });

  const operators = operatorsData?.data || [];
  const gadgets = gadgetsData?.data || [];

  const lowerSearch = search.toLowerCase();
  const filteredOperators = lowerSearch
    ? operators.filter((op) => op.name.toLowerCase().includes(lowerSearch))
    : operators;
  const filteredGadgets = lowerSearch
    ? gadgets.filter((g) => g.name.toLowerCase().includes(lowerSearch))
    : gadgets;

  const uniqueGadgets = filteredGadgets.filter((g) => g.category === 'unique');
  const secondaryGadgets = filteredGadgets.filter((g) => g.category === 'secondary');
  const generalGadgets = filteredGadgets.filter((g) => g.category === 'general');

  const attackers = filteredOperators.filter((op) => op.isAttacker);
  const defenders = filteredOperators.filter((op) => !op.isAttacker);

  const handleSelect = (icon: { type: 'operator' | 'gadget'; id: string; url: string; name?: string; color?: string }) => {
    setSelectedIcon(icon);
    setTool(Tool.Icon);
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className={`absolute top-1/2 -translate-y-1/2 z-20 flex items-center gap-0.5 px-1 py-3 bg-background/95 backdrop-blur border border-l-0 rounded-r-lg hover:bg-muted transition-all duration-200 ${!hasBeenSeen && !open ? 'animate-pulse' : ''}`}
        style={{ left: open ? 280 : 0 }}
        title={open ? 'Close icon panel' : 'Operators & Gadgets'}
      >
        {open ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <>
            <ChevronRight className="h-4 w-4 shrink-0" />
            <span className="text-[10px] font-medium tracking-wide whitespace-nowrap" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
              Icons
            </span>
          </>
        )}
      </button>

      {/* Sidebar panel */}
      <div
        className="absolute left-0 top-0 bottom-0 z-10 bg-background/95 backdrop-blur border-r overflow-hidden transition-all duration-200 ease-in-out"
        style={{ width: open ? 280 : 0 }}
      >
        {open && (
          <div className="flex flex-col h-full w-[280px]">
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="operators" className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-3 mt-2">
                <TabsTrigger value="operators" className="flex-1 text-xs">Operators</TabsTrigger>
                <TabsTrigger value="gadgets" className="flex-1 text-xs">Gadgets</TabsTrigger>
              </TabsList>

              <TabsContent value="operators" className="flex-1 overflow-y-auto px-3 pb-3 mt-2">
                {attackers.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Attackers</p>
                    <div className="grid grid-cols-4 gap-1">
                      {attackers.map((op) => (
                        <Button
                          key={op.id}
                          variant={selectedIcon?.id === op.id ? 'default' : 'ghost'}
                          className="h-14 w-full p-0 flex flex-col items-center justify-center gap-0.5"
                          title={op.name}
                          onClick={() => handleSelect({ type: 'operator', id: op.id, url: op.icon || '', name: op.name, color: op.color })}
                        >
                          {op.icon ? (
                            <img src={`/uploads${op.icon}`} alt={op.name} className="h-8 w-8 rounded-full" />
                          ) : (
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: op.color }}
                            >
                              {op.name[0]}
                            </div>
                          )}
                          <span className="text-[9px] leading-tight truncate w-full text-center">{op.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {defenders.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Defenders</p>
                    <div className="grid grid-cols-4 gap-1">
                      {defenders.map((op) => (
                        <Button
                          key={op.id}
                          variant={selectedIcon?.id === op.id ? 'default' : 'ghost'}
                          className="h-14 w-full p-0 flex flex-col items-center justify-center gap-0.5"
                          title={op.name}
                          onClick={() => handleSelect({ type: 'operator', id: op.id, url: op.icon || '', name: op.name, color: op.color })}
                        >
                          {op.icon ? (
                            <img src={`/uploads${op.icon}`} alt={op.name} className="h-8 w-8 rounded-full" />
                          ) : (
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: op.color }}
                            >
                              {op.name[0]}
                            </div>
                          )}
                          <span className="text-[9px] leading-tight truncate w-full text-center">{op.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {filteredOperators.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No operators found</p>
                )}
              </TabsContent>

              <TabsContent value="gadgets" className="flex-1 overflow-y-auto px-3 pb-3 mt-2">
                {[
                  { label: 'Unique', items: uniqueGadgets },
                  { label: 'Secondary', items: secondaryGadgets },
                  { label: 'General', items: generalGadgets },
                ].map(({ label, items }) => items.length > 0 && (
                  <div key={label} className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">{label}</p>
                    <div className="grid grid-cols-4 gap-1">
                      {items.map((g) => (
                        <Button
                          key={g.id}
                          variant={selectedIcon?.id === g.id ? 'default' : 'ghost'}
                          className="h-14 w-full p-0 flex flex-col items-center justify-center gap-0.5"
                          title={g.name}
                          onClick={() => handleSelect({ type: 'gadget', id: g.id, url: g.icon || '', name: g.name, color: CATEGORY_COLORS[g.category] || '#888888' })}
                        >
                          {g.icon ? (
                            <img src={`/uploads${g.icon}`} alt={g.name} className="h-8 w-8" />
                          ) : (
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ backgroundColor: CATEGORY_COLORS[g.category] || '#888888' }}
                            >
                              {getGadgetAbbrev(g.name)}
                            </div>
                          )}
                          <span className="text-[9px] leading-tight truncate w-full text-center">{g.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredGadgets.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No gadgets found</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </>
  );
}
