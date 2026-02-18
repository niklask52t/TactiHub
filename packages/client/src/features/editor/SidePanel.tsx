/**
 * Side panel — operator tool panel for one side (ATK or DEF).
 * Contains: visibility row, landscape section, tool grid with gadgets, operator avatars.
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tool } from '@tactihub/shared';
import type { StratOperatorSlot, Operator, Gadget } from '@tactihub/shared';
import { apiGet } from '@/lib/api';
import { useStratStore } from '@/stores/strat.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { SidePanelToolGrid } from './SidePanelToolGrid';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Pencil, Minus, Square, Type } from 'lucide-react';

interface SidePanelProps {
  side: 'attacker' | 'defender';
  gameSlug: string;
  readOnly?: boolean;
  onVisibilityToggle?: (slotId: string, visible: boolean) => void;
  onColorChange?: (slotId: string, color: string) => void;
}

const LANDSCAPE_TOOLS: Array<{ tool: Tool; icon: typeof Pencil; label: string }> = [
  { tool: Tool.Pen, icon: Pencil, label: 'Pen' },
  { tool: Tool.Line, icon: Minus, label: 'Line' },
  { tool: Tool.Rectangle, icon: Square, label: 'Rect' },
  { tool: Tool.Text, icon: Type, label: 'Text' },
];

const CATEGORY_ORDER: Record<string, number> = { unique: 0, secondary: 1, general: 2 };

export function SidePanel({ side, gameSlug, readOnly, onVisibilityToggle, onColorChange }: SidePanelProps) {
  const operatorSlots = useStratStore(s => s.operatorSlots);
  const slots = useMemo(
    () => operatorSlots.filter(s => s.side === side).sort((a, b) => a.slotNumber - b.slotNumber),
    [operatorSlots, side],
  );
  const activeSlotId = useStratStore(s => s.activeOperatorSlotId);
  const landscapeColor = useStratStore(s => s.landscapeColor);
  const landscapeVisible = useStratStore(s => s.landscapeVisible);
  const setLandscapeColor = useStratStore(s => s.setLandscapeColor);
  const setLandscapeVisible = useStratStore(s => s.setLandscapeVisible);
  const setActiveSlotId = useStratStore(s => s.setActiveOperatorSlotId);
  const updateSlot = useStratStore(s => s.updateOperatorSlot);
  const activeTool = useCanvasStore(s => s.tool);
  const setTool = useCanvasStore(s => s.setTool);
  const setColor = useCanvasStore(s => s.setColor);
  const selectedIcon = useCanvasStore(s => s.selectedIcon);
  const setSelectedIcon = useCanvasStore(s => s.setSelectedIcon);

  const accentColor = side === 'attacker' ? '#1a8fe3' : '#e33a3a';

  // Fetch operators (with gadgets) for this game
  const { data: operatorsData } = useQuery({
    queryKey: ['operators', gameSlug],
    queryFn: () => apiGet<{ data: Operator[] }>(`/games/${gameSlug}/operators`),
    staleTime: 5 * 60 * 1000,
    enabled: !!gameSlug,
  });

  // Fetch all gadgets to get general-category ones
  const { data: gadgetsData } = useQuery({
    queryKey: ['gadgets', gameSlug],
    queryFn: () => apiGet<{ data: Gadget[] }>(`/games/${gameSlug}/gadgets`),
    staleTime: 5 * 60 * 1000,
    enabled: !!gameSlug,
  });

  // Build operator lookup: operatorId → Operator (with gadgets)
  const operatorMap = useMemo(() => {
    const all = operatorsData?.data || [];
    const map: Record<string, Operator> = {};
    for (const op of all) map[op.id] = op;
    return map;
  }, [operatorsData]);

  // General gadgets (shown for all slots regardless of operator)
  const generalGadgets = useMemo(() => {
    const all = gadgetsData?.data || [];
    return all.filter(g => g.category === 'general');
  }, [gadgetsData]);

  // Compute unified gadget rows and per-slot availability
  const { gadgetRows, slotGadgetIds } = useMemo(() => {
    const seen = new Set<string>();
    const rows: Gadget[] = [];

    // Collect gadgets from assigned operators
    for (const slot of slots) {
      if (!slot.operatorId) continue;
      const op = operatorMap[slot.operatorId];
      if (!op?.gadgets) continue;
      for (const g of op.gadgets) {
        if (!seen.has(g.id)) {
          seen.add(g.id);
          rows.push(g);
        }
      }
    }

    // Add general gadgets
    for (const g of generalGadgets) {
      if (!seen.has(g.id)) {
        seen.add(g.id);
        rows.push(g);
      }
    }

    // Sort: unique → secondary → general, then by name
    rows.sort((a, b) => {
      const catDiff = (CATEGORY_ORDER[a.category] ?? 9) - (CATEGORY_ORDER[b.category] ?? 9);
      if (catDiff !== 0) return catDiff;
      return a.name.localeCompare(b.name);
    });

    // Build per-slot gadget ID sets
    const generalIds = new Set(generalGadgets.map(g => g.id));
    const sgi = new Map<string, Set<string>>();
    for (const slot of slots) {
      const ids = new Set(generalIds);
      if (slot.operatorId) {
        const op = operatorMap[slot.operatorId];
        if (op?.gadgets) {
          for (const g of op.gadgets) ids.add(g.id);
        }
      }
      sgi.set(slot.id, ids);
    }

    return { gadgetRows: rows, slotGadgetIds: sgi };
  }, [slots, operatorMap, generalGadgets]);

  const handleToolCellClick = useCallback((slotId: string, tool: Tool) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;
    setActiveSlotId(slotId);
    setTool(tool);
    setColor(slot.color);
    if (tool !== Tool.Icon) setSelectedIcon(null);
  }, [slots, setActiveSlotId, setTool, setColor, setSelectedIcon]);

  const handleGadgetCellClick = useCallback((slotId: string, gadget: Gadget) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;
    setActiveSlotId(slotId);
    setTool(Tool.Icon);
    setColor(slot.color);
    const op = slot.operatorId ? operatorMap[slot.operatorId] : null;
    setSelectedIcon({
      type: 'gadget',
      id: gadget.id,
      url: gadget.icon || '',
      name: gadget.name,
      color: slot.color,
      operatorIcon: op?.icon || undefined,
    });
  }, [slots, operatorMap, setActiveSlotId, setTool, setColor, setSelectedIcon]);

  const handleLandscapeTool = (tool: Tool) => {
    setActiveSlotId(null);
    setTool(tool);
    setColor(landscapeColor);
    setSelectedIcon(null);
  };

  const handleVisibilityChange = (slot: StratOperatorSlot, visible: boolean) => {
    updateSlot(slot.id, { visible });
    onVisibilityToggle?.(slot.id, visible);
  };

  const handleColorChange = (slot: StratOperatorSlot, color: string) => {
    updateSlot(slot.id, { color });
    onColorChange?.(slot.id, color);
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto border-r bg-background/80 px-2 py-2"
      style={{ borderColor: `${accentColor}33` }}
    >
      {/* Header */}
      <p className="text-[10px] font-bold uppercase tracking-wider text-center mb-2" style={{ color: accentColor }}>
        {side === 'attacker' ? 'Attackers' : 'Defenders'}
      </p>

      {/* Visibility row + color indicators */}
      <div className="flex items-center justify-around mb-2">
        {slots.map(slot => (
          <div key={slot.id} className="flex flex-col items-center gap-0.5">
            <Checkbox
              checked={slot.visible}
              onCheckedChange={(v) => handleVisibilityChange(slot, !!v)}
              className="h-3.5 w-3.5"
              disabled={readOnly}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <input
                  type="color"
                  value={slot.color}
                  onChange={(e) => handleColorChange(slot, e.target.value)}
                  className="h-3 w-5 p-0 border-0 cursor-pointer rounded-sm"
                  disabled={readOnly}
                />
              </TooltipTrigger>
              <TooltipContent className="text-xs">Color: {slot.operatorName || `Slot ${slot.slotNumber}`}</TooltipContent>
            </Tooltip>
          </div>
        ))}
      </div>

      {/* Landscape section */}
      <div className="mb-2 p-1.5 rounded border border-dashed border-green-600/40 bg-green-900/10">
        <div className="flex items-center gap-1.5 mb-1">
          <input
            type="color"
            value={landscapeColor}
            onChange={(e) => { setLandscapeColor(e.target.value); if (!activeSlotId) setColor(e.target.value); }}
            className="h-4 w-4 p-0 border-0 cursor-pointer rounded-sm"
            disabled={readOnly}
          />
          <span className="text-[9px] text-green-400 font-medium">Landscape</span>
          <Checkbox
            checked={landscapeVisible}
            onCheckedChange={(v) => setLandscapeVisible(!!v)}
            className="h-3 w-3 ml-auto"
            disabled={readOnly}
          />
        </div>
        {!readOnly && (
          <div className="flex gap-0.5">
            {LANDSCAPE_TOOLS.map(({ tool, icon: Icon, label }) => {
              const isActive = !activeSlotId && activeTool === tool;
              return (
                <Tooltip key={tool}>
                  <TooltipTrigger asChild>
                    <button
                      className={`flex items-center justify-center h-6 flex-1 rounded-sm transition-colors ${
                        isActive ? 'bg-green-600 text-white' : 'hover:bg-muted text-muted-foreground'
                      }`}
                      onClick={() => handleLandscapeTool(tool)}
                    >
                      <Icon className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">{label} (Landscape)</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>

      {/* Tool grid + gadget rows */}
      <SidePanelToolGrid
        slots={slots}
        activeTool={activeTool}
        activeSlotId={activeSlotId}
        onCellClick={handleToolCellClick}
        gadgetRows={gadgetRows}
        slotGadgetIds={slotGadgetIds}
        onGadgetClick={handleGadgetCellClick}
        activeGadgetId={activeTool === Tool.Icon ? selectedIcon?.id ?? null : null}
        readOnly={readOnly}
      />

      {/* Operator avatars */}
      <div className="flex items-center justify-around mt-2 pt-2 border-t border-border/50">
        {slots.map(slot => (
          <Tooltip key={slot.id}>
            <TooltipTrigger asChild>
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden ${
                  activeSlotId === slot.id ? 'ring-2 ring-primary' : ''
                }`}
                style={{ backgroundColor: slot.operatorId ? slot.color : '#555' }}
              >
                {slot.operatorId && operatorMap[slot.operatorId]?.icon ? (
                  <img
                    src={`/uploads${operatorMap[slot.operatorId]!.icon}`}
                    alt={slot.operatorName || ''}
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  slot.operatorName?.[0] || '?'
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{slot.operatorName || `Slot ${slot.slotNumber}`}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
