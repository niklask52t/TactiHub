import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Operator } from '@strathub/shared';

interface Slot {
  id: string;
  slotNumber: number;
  operatorId: string | null;
  operator?: Operator | null;
}

interface OperatorSlotsProps {
  slots: Slot[];
  operators: Operator[];
  onSlotChange?: (slotId: string, operatorId: string | null) => void;
  readOnly?: boolean;
}

export function OperatorSlots({ slots, operators, onSlotChange, readOnly = false }: OperatorSlotsProps) {
  return (
    <div className="flex gap-2 p-2 bg-background border rounded-lg">
      {slots.map((slot) => (
        <div key={slot.id} className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">Slot {slot.slotNumber}</span>
          {readOnly ? (
            <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: slot.operator?.color || '#555' }}>
              {slot.operator ? (
                slot.operator.icon ? (
                  <img src={`/uploads${slot.operator.icon}`} className="w-7 h-7 rounded-full" alt="" />
                ) : (
                  <span className="text-xs font-bold">{slot.operator.name.slice(0, 2)}</span>
                )
              ) : (
                <span className="text-xs text-muted-foreground">?</span>
              )}
            </div>
          ) : (
            <Select
              value={slot.operatorId || ''}
              onValueChange={(val) => onSlotChange?.(slot.id, val || null)}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue placeholder="Empty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Empty</SelectItem>
                {operators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: op.color }} />
                      {op.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}
    </div>
  );
}
