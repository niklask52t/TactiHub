import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { useCanvasStore } from '@/stores/canvas.store';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

interface IconPickerProps {
  gameSlug: string;
}

export function IconPicker({ gameSlug }: IconPickerProps) {
  const { selectedIcon, setSelectedIcon } = useCanvasStore();

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
  const gadgets = (gadgetsData?.data || []).filter((g) => g.icon);

  const attackers = operators.filter((op) => op.isAttacker);
  const defenders = operators.filter((op) => !op.isAttacker);

  return (
    <div className="absolute top-full left-0 mt-2 z-50 bg-background border rounded-lg shadow-lg p-3 w-72">
      <Tabs defaultValue="operators">
        <TabsList className="w-full">
          <TabsTrigger value="operators" className="flex-1 text-xs">Operators</TabsTrigger>
          <TabsTrigger value="gadgets" className="flex-1 text-xs">Gadgets</TabsTrigger>
        </TabsList>

        <TabsContent value="operators" className="mt-2">
          {attackers.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-muted-foreground mb-1">Attackers</p>
              <div className="grid grid-cols-6 gap-1">
                {attackers.map((op) => (
                  <Button
                    key={op.id}
                    variant={selectedIcon?.id === op.id ? 'default' : 'ghost'}
                    size="icon"
                    className="h-9 w-9 p-0"
                    title={op.name}
                    onClick={() => setSelectedIcon({ type: 'operator', id: op.id, url: op.icon || '' })}
                  >
                    {op.icon ? (
                      <img src={`/uploads${op.icon}`} alt={op.name} className="h-7 w-7 rounded-full" />
                    ) : (
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: op.color }}
                      >
                        {op.name[0]}
                      </div>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {defenders.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Defenders</p>
              <div className="grid grid-cols-6 gap-1">
                {defenders.map((op) => (
                  <Button
                    key={op.id}
                    variant={selectedIcon?.id === op.id ? 'default' : 'ghost'}
                    size="icon"
                    className="h-9 w-9 p-0"
                    title={op.name}
                    onClick={() => setSelectedIcon({ type: 'operator', id: op.id, url: op.icon || '' })}
                  >
                    {op.icon ? (
                      <img src={`/uploads${op.icon}`} alt={op.name} className="h-7 w-7 rounded-full" />
                    ) : (
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: op.color }}
                      >
                        {op.name[0]}
                      </div>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {operators.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No operators found</p>
          )}
        </TabsContent>

        <TabsContent value="gadgets" className="mt-2">
          <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
            {gadgets.map((g) => (
              <Button
                key={g.id}
                variant={selectedIcon?.id === g.id ? 'default' : 'ghost'}
                size="icon"
                className="h-9 w-9 p-0"
                title={g.name}
                onClick={() => setSelectedIcon({ type: 'gadget', id: g.id, url: g.icon! })}
              >
                <img src={`/uploads${g.icon}`} alt={g.name} className="h-7 w-7" />
              </Button>
            ))}
          </div>
          {gadgets.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No gadgets with icons</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
