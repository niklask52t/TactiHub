import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { useCanvasStore } from '@/stores/canvas.store';
import { Tool } from '@tactihub/shared';
import type { OperatorSlot } from '@tactihub/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Search, Plus, Trash2 } from 'lucide-react';

interface Operator {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  isAttacker: boolean;
  gadgets?: Gadget[];
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
  battleplanId?: string;
  operatorSlots?: OperatorSlot[];
  onSlotChange?: (slotId: string, operatorId: string | null) => void;
  onCreateAttackerLineup?: () => void;
  onRemoveAttackerLineup?: () => void;
  isAuthenticated?: boolean;
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

export function IconSidebar({
  gameSlug, open, onToggle,
  operatorSlots, onSlotChange,
  onCreateAttackerLineup, onRemoveAttackerLineup,
  isAuthenticated,
}: IconSidebarProps) {
  const { selectedIcon, setSelectedIcon, setTool } = useCanvasStore();
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
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

  // Lineup data
  const defenderSlots = useMemo(() =>
    (operatorSlots || []).filter(s => s.side === 'defender').sort((a, b) => a.slotNumber - b.slotNumber),
    [operatorSlots]
  );
  const attackerSlots = useMemo(() =>
    (operatorSlots || []).filter(s => s.side === 'attacker').sort((a, b) => a.slotNumber - b.slotNumber),
    [operatorSlots]
  );
  const hasAttackerLineup = attackerSlots.length > 0;

  // IDs of operators in the lineup
  const lineupDefenderIds = useMemo(() =>
    new Set(defenderSlots.filter(s => s.operatorId).map(s => s.operatorId!)),
    [defenderSlots]
  );
  const lineupAttackerIds = useMemo(() =>
    new Set(attackerSlots.filter(s => s.operatorId).map(s => s.operatorId!)),
    [attackerSlots]
  );
  const allLineupOperatorIds = useMemo(() =>
    new Set([...lineupDefenderIds, ...lineupAttackerIds]),
    [lineupDefenderIds, lineupAttackerIds]
  );

  // Whether lineup has any assigned operators (to decide filtering)
  const hasAnyLineupOperators = allLineupOperatorIds.size > 0;

  // Gadget IDs from lineup operators
  const lineupGadgetIds = useMemo(() => {
    const ids = new Set<string>();
    for (const op of operators) {
      if (allLineupOperatorIds.has(op.id) && op.gadgets) {
        for (const g of op.gadgets) {
          ids.add(g.id);
        }
      }
    }
    return ids;
  }, [operators, allLineupOperatorIds]);

  // Search filter
  const lowerSearch = search.toLowerCase();

  // Filtered operators for the Operators tab
  const allAttackers = operators.filter(op => op.isAttacker);
  const allDefenders = operators.filter(op => !op.isAttacker);

  const filteredOperatorsForTab = useMemo(() => {
    let filtered = operators;
    if (lowerSearch) {
      filtered = filtered.filter(op => op.name.toLowerCase().includes(lowerSearch));
    }
    return filtered;
  }, [operators, lowerSearch]);

  const filteredGadgetsForTab = useMemo(() => {
    let filtered = gadgets;
    if (lowerSearch) {
      filtered = filtered.filter(g => g.name.toLowerCase().includes(lowerSearch));
    }
    return filtered;
  }, [gadgets, lowerSearch]);

  // Get available operators for lineup dropdowns (not already assigned in same side)
  const getAvailableOperators = (side: 'defender' | 'attacker', currentSlotId: string) => {
    const sideOps = side === 'defender' ? allDefenders : allAttackers;
    const sideSlots = side === 'defender' ? defenderSlots : attackerSlots;
    const assignedIds = new Set(
      sideSlots.filter(s => s.id !== currentSlotId && s.operatorId).map(s => s.operatorId!)
    );
    return sideOps.filter(op => !assignedIds.has(op.id));
  };

  const handleSelect = (icon: { type: 'operator' | 'gadget'; id: string; url: string; name?: string; color?: string }) => {
    setSelectedIcon(icon);
    setTool(Tool.Icon);
  };

  const renderOperatorButton = (op: Operator, isInLineup: boolean) => (
    <div key={op.id} className="relative">
      <Button
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
      {!isInLineup && hasAnyLineupOperators && (
        <span className="absolute -bottom-0.5 left-0 right-0 text-[7px] text-orange-400 text-center font-medium leading-tight">Nicht im Lineup</span>
      )}
    </div>
  );

  const renderGadgetButton = (g: Gadget, isInLineup: boolean) => (
    <div key={g.id} className="relative">
      <Button
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
      {!isInLineup && hasAnyLineupOperators && (
        <span className="absolute -bottom-0.5 left-0 right-0 text-[7px] text-orange-400 text-center font-medium leading-tight">Nicht im Lineup</span>
      )}
    </div>
  );

  // Operators tab: determine which to show
  const getVisibleOperators = (side: 'defender' | 'attacker') => {
    const sideOps = filteredOperatorsForTab.filter(op => side === 'attacker' ? op.isAttacker : !op.isAttacker);
    if (!hasAnyLineupOperators) return sideOps; // Show all when no lineup assigned
    if (showAll) return sideOps;
    const lineupIds = side === 'defender' ? lineupDefenderIds : lineupAttackerIds;
    return sideOps.filter(op => lineupIds.has(op.id));
  };

  // Whether to show attacker section in operators tab
  const showAttackerSection = () => {
    if (!hasAttackerLineup) return false;
    if (showAll) return true;
    if (!hasAnyLineupOperators) return true;
    return lineupAttackerIds.size > 0;
  };

  // Gadgets tab: determine which to show
  const getVisibleGadgets = () => {
    if (!hasAnyLineupOperators) return filteredGadgetsForTab;
    if (showAll) return filteredGadgetsForTab;
    return filteredGadgetsForTab.filter(g => lineupGadgetIds.has(g.id));
  };

  const renderSlotRow = (slot: OperatorSlot, side: 'defender' | 'attacker') => {
    const available = getAvailableOperators(side, slot.id);
    const currentOp = operators.find(op => op.id === slot.operatorId);

    return (
      <div key={slot.id} className="flex items-center gap-2 mb-1.5">
        {/* Slot number */}
        <span className="text-xs text-muted-foreground w-4 text-right">{slot.slotNumber}</span>
        {/* Avatar */}
        <div className="h-7 w-7 rounded-full flex items-center justify-center overflow-hidden bg-muted shrink-0">
          {currentOp?.icon ? (
            <img src={`/uploads${currentOp.icon}`} alt={currentOp.name} className="h-7 w-7 rounded-full" />
          ) : currentOp ? (
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: currentOp.color }}>
              {currentOp.name[0]}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">?</span>
          )}
        </div>
        {/* Select dropdown */}
        {isAuthenticated && onSlotChange ? (
          <Select
            value={slot.operatorId || '__none'}
            onValueChange={(val) => onSlotChange(slot.id, val === '__none' ? null : val)}
          >
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue placeholder="Select operator..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">— None —</SelectItem>
              {available.map(op => (
                <SelectItem key={op.id} value={op.id}>
                  {op.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-muted-foreground flex-1 truncate">
            {currentOp?.name || '— Empty —'}
          </span>
        )}
      </div>
    );
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
            <Tabs defaultValue="lineup" className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-3 mt-2">
                <TabsTrigger value="lineup" className="flex-1 text-xs">Lineup</TabsTrigger>
                <TabsTrigger value="operators" className="flex-1 text-xs">Operators</TabsTrigger>
                <TabsTrigger value="gadgets" className="flex-1 text-xs">Gadgets</TabsTrigger>
              </TabsList>

              {/* Lineup Tab */}
              <TabsContent value="lineup" className="flex-1 overflow-y-auto px-3 pb-3 mt-2">
                {/* Defenders */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                    Defenders
                  </p>
                  {defenderSlots.map(slot => renderSlotRow(slot, 'defender'))}
                </div>

                {/* Attackers */}
                {hasAttackerLineup ? (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                        Attackers
                      </p>
                      {isAuthenticated && onRemoveAttackerLineup && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1 text-destructive hover:text-destructive"
                          onClick={onRemoveAttackerLineup}
                          title="Remove attacker lineup"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {attackerSlots.map(slot => renderSlotRow(slot, 'attacker'))}
                  </div>
                ) : isAuthenticated && onCreateAttackerLineup ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={onCreateAttackerLineup}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Attacker Lineup
                  </Button>
                ) : null}
              </TabsContent>

              {/* Operators Tab */}
              <TabsContent value="operators" className="flex-1 overflow-y-auto px-3 pb-3 mt-2">
                {/* Show all toggle */}
                {hasAnyLineupOperators && (
                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox
                      id="showAllOps"
                      checked={showAll}
                      onCheckedChange={(v) => setShowAll(!!v)}
                    />
                    <label htmlFor="showAllOps" className="text-xs text-muted-foreground cursor-pointer">
                      Show all operators
                    </label>
                  </div>
                )}

                {/* Defenders section */}
                {(() => {
                  const visibleDefs = getVisibleOperators('defender');
                  return visibleDefs.length > 0 ? (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Defenders</p>
                      <div className="grid grid-cols-4 gap-1">
                        {visibleDefs.map(op => renderOperatorButton(op, lineupDefenderIds.has(op.id)))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Attackers section */}
                {showAttackerSection() && (() => {
                  const visibleAtks = getVisibleOperators('attacker');
                  return visibleAtks.length > 0 ? (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Attackers</p>
                      <div className="grid grid-cols-4 gap-1">
                        {visibleAtks.map(op => renderOperatorButton(op, lineupAttackerIds.has(op.id)))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {filteredOperatorsForTab.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No operators found</p>
                )}
              </TabsContent>

              {/* Gadgets Tab */}
              <TabsContent value="gadgets" className="flex-1 overflow-y-auto px-3 pb-3 mt-2">
                {/* Show all toggle */}
                {hasAnyLineupOperators && (
                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox
                      id="showAllGadgets"
                      checked={showAll}
                      onCheckedChange={(v) => setShowAll(!!v)}
                    />
                    <label htmlFor="showAllGadgets" className="text-xs text-muted-foreground cursor-pointer">
                      Show all gadgets
                    </label>
                  </div>
                )}

                {(() => {
                  const visible = getVisibleGadgets();
                  const uniqueG = visible.filter(g => g.category === 'unique');
                  const secondaryG = visible.filter(g => g.category === 'secondary');
                  const generalG = visible.filter(g => g.category === 'general');

                  return [
                    { label: 'Unique', items: uniqueG },
                    { label: 'Secondary', items: secondaryG },
                    { label: 'General', items: generalG },
                  ].map(({ label, items }) => items.length > 0 ? (
                    <div key={label} className="mb-3">
                      <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">{label}</p>
                      <div className="grid grid-cols-4 gap-1">
                        {items.map(g => renderGadgetButton(g, lineupGadgetIds.has(g.id)))}
                      </div>
                    </div>
                  ) : null);
                })()}

                {getVisibleGadgets().length === 0 && (
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
