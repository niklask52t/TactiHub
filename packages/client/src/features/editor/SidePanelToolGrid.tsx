/**
 * 5-column × N-row tool matrix for one side's operator slots.
 * Clicking a cell sets BOTH the active operator AND the active tool.
 */

import { Tool } from '@tactihub/shared';
import type { StratOperatorSlot } from '@tactihub/shared';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Pencil, Minus, Square, Type, Image, Eraser, MousePointer2 } from 'lucide-react';

const TOOL_ROWS: Array<{ tool: Tool; icon: typeof Pencil; label: string }> = [
  { tool: Tool.Pen, icon: Pencil, label: 'Pen' },
  { tool: Tool.Line, icon: Minus, label: 'Line' },
  { tool: Tool.Rectangle, icon: Square, label: 'Rectangle' },
  { tool: Tool.Text, icon: Type, label: 'Text' },
  { tool: Tool.Icon, icon: Image, label: 'Icon' },
  { tool: Tool.Eraser, icon: Eraser, label: 'Eraser' },
  { tool: Tool.Select, icon: MousePointer2, label: 'Select' },
];

interface SidePanelToolGridProps {
  slots: StratOperatorSlot[];
  activeTool: Tool;
  activeSlotId: string | null;
  onCellClick: (slotId: string, tool: Tool) => void;
  readOnly?: boolean;
}

export function SidePanelToolGrid({
  slots, activeTool, activeSlotId, onCellClick, readOnly,
}: SidePanelToolGridProps) {
  if (readOnly) return null;

  return (
    <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${slots.length}, 1fr)` }}>
      {TOOL_ROWS.map(({ tool, icon: Icon, label }) =>
        slots.map((slot) => {
          const isActive = activeSlotId === slot.id && activeTool === tool;
          return (
            <Tooltip key={`${slot.id}-${tool}`}>
              <TooltipTrigger asChild>
                <button
                  className={`flex items-center justify-center h-7 w-full rounded-sm transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  } ${!slot.operatorId ? 'opacity-40' : ''}`}
                  onClick={() => onCellClick(slot.id, tool)}
                  disabled={!slot.operatorId && tool !== Tool.Eraser && tool !== Tool.Select}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {label} — {slot.operatorName || `Slot ${slot.slotNumber}`}
              </TooltipContent>
            </Tooltip>
          );
        })
      )}
    </div>
  );
}
