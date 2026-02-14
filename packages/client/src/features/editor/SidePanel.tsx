/**
 * Side panel — operator tool panel for one side (ATK or DEF).
 * Contains: visibility row, landscape section, tool grid, operator avatars.
 */

import { Tool } from '@tactihub/shared';
import type { StratOperatorSlot } from '@tactihub/shared';
import { useStratStore } from '@/stores/strat.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { SidePanelToolGrid } from './SidePanelToolGrid';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Pencil, Minus, Square, Type } from 'lucide-react';

interface SidePanelProps {
  side: 'attacker' | 'defender';
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

export function SidePanel({ side, readOnly, onVisibilityToggle, onColorChange }: SidePanelProps) {
  const slots = useStratStore(s => side === 'attacker' ? s.getAttackerSlots() : s.getDefenderSlots());
  const activeSlotId = useStratStore(s => s.activeOperatorSlotId);
  const { landscapeColor, landscapeVisible, setLandscapeColor, setLandscapeVisible } = useStratStore();
  const { tool: activeTool, setTool, setColor } = useCanvasStore();
  const setActiveSlotId = useStratStore(s => s.setActiveOperatorSlotId);
  const updateSlot = useStratStore(s => s.updateOperatorSlot);

  const accentColor = side === 'attacker' ? '#1a8fe3' : '#e33a3a';

  const handleToolCellClick = (slotId: string, tool: Tool) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;
    setActiveSlotId(slotId);
    setTool(tool);
    setColor(slot.color);
  };

  const handleLandscapeTool = (tool: Tool) => {
    setActiveSlotId(null);
    setTool(tool);
    setColor(landscapeColor);
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

      {/* Tool grid */}
      <SidePanelToolGrid
        slots={slots}
        activeTool={activeTool}
        activeSlotId={activeSlotId}
        onCellClick={handleToolCellClick}
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
                {slot.operatorName?.[0] || '?'}
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{slot.operatorName || `Slot ${slot.slotNumber}`}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
