/**
 * Horizontal operator slots strip — r6calls style.
 * 5 ATK "?" slots (blue) + separator + 5 DEF "?" slots (red).
 */

import { useStratStore } from '@/stores/strat.store';
import { OperatorPickerPopover } from './OperatorPickerPopover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Swords } from 'lucide-react';
import type { StratOperatorSlot } from '@tactihub/shared';

interface OperatorStripProps {
  gameSlug: string;
  readOnly?: boolean;
  onOperatorAssign?: (slotId: string, operatorId: string | null) => void;
}

export function OperatorStrip({ gameSlug, readOnly, onOperatorAssign }: OperatorStripProps) {
  const attackerSlots = useStratStore((s) => s.getAttackerSlots());
  const defenderSlots = useStratStore((s) => s.getDefenderSlots());
  const activeSlotId = useStratStore((s) => s.activeOperatorSlotId);
  const setActiveSlotId = useStratStore((s) => s.setActiveOperatorSlotId);

  const renderSlot = (slot: StratOperatorSlot, borderColor: string) => {
    const isActive = activeSlotId === slot.id;
    const inner = (
      <button
        className={`relative h-9 w-9 rounded-full flex items-center justify-center transition-all ${
          isActive ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''
        }`}
        style={{ border: `2px solid ${borderColor}` }}
        onClick={() => setActiveSlotId(slot.id)}
      >
        {slot.operatorId ? (
          <div className="h-full w-full rounded-full overflow-hidden">
            {/* Try operator icon first, fall back to color circle */}
            <div
              className="h-full w-full rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: slot.color }}
            >
              {slot.operatorName?.[0] || '?'}
            </div>
          </div>
        ) : (
          <span className="text-sm font-bold text-muted-foreground">?</span>
        )}
      </button>
    );

    if (readOnly || !onOperatorAssign) {
      return (
        <Tooltip key={slot.id}>
          <TooltipTrigger asChild>{inner}</TooltipTrigger>
          <TooltipContent className="text-xs">{slot.operatorName || `Slot ${slot.slotNumber}`}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <OperatorPickerPopover
        key={slot.id}
        side={slot.side}
        slotId={slot.id}
        gameSlug={gameSlug}
        trigger={
          <Tooltip>
            <TooltipTrigger asChild>{inner}</TooltipTrigger>
            <TooltipContent className="text-xs">
              {slot.operatorName || 'Click to assign'} — Right-click to change
            </TooltipContent>
          </Tooltip>
        }
        onSelect={onOperatorAssign}
      />
    );
  };

  return (
    <div className="flex items-center justify-center gap-1.5 py-1">
      {/* ATK slots */}
      <div className="flex items-center gap-1">
        {attackerSlots.map(slot => renderSlot(slot, '#1a8fe3'))}
      </div>

      {/* Separator */}
      <div className="flex items-center justify-center h-8 w-8 text-muted-foreground">
        <Swords className="h-4 w-4" />
      </div>

      {/* DEF slots */}
      <div className="flex items-center gap-1">
        {defenderSlots.map(slot => renderSlot(slot, '#e33a3a'))}
      </div>
    </div>
  );
}
