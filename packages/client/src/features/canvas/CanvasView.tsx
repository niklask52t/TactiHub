import { useState, useMemo } from 'react';
import { CanvasLayer } from './CanvasLayer';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Floor {
  id: string;
  mapFloorId: string;
  mapFloor?: { id: string; name: string; floorNumber: number; imagePath: string };
  draws?: any[];
}

interface OperatorSlotData {
  id: string; slotNumber: number; operatorId: string | null; operator?: any;
}

interface CanvasViewProps {
  floors: Floor[];
  operatorSlots?: OperatorSlotData[];
  readOnly?: boolean;
  onDrawCreate?: (floorId: string, draws: any[]) => void;
  onDrawDelete?: (drawIds: string[]) => void;
}

export function CanvasView({ floors, readOnly = false, onDrawCreate, onDrawDelete }: CanvasViewProps) {
  const sortedFloors = useMemo(() =>
    [...floors].sort((a, b) => (a.mapFloor?.floorNumber ?? 0) - (b.mapFloor?.floorNumber ?? 0)),
    [floors],
  );

  const [currentFloorIndex, setCurrentFloorIndex] = useState(0);
  const currentFloor = sortedFloors[currentFloorIndex];

  const goUp = () => setCurrentFloorIndex((i) => Math.min(i + 1, sortedFloors.length - 1));
  const goDown = () => setCurrentFloorIndex((i) => Math.max(i - 1, 0));

  // Keyboard shortcuts for J/K floor switching
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'k' || e.key === 'K') goUp();
    if (e.key === 'j' || e.key === 'J') goDown();
  };

  if (sortedFloors.length === 0) {
    return <div className="flex items-center justify-center h-96 text-muted-foreground">No floors available</div>;
  }

  return (
    <div className="relative" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Floor switcher */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-center gap-1 bg-background/90 rounded-lg border p-2">
        <Button variant="ghost" size="sm" onClick={goUp} disabled={currentFloorIndex >= sortedFloors.length - 1}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium px-2">
          {currentFloor?.mapFloor?.name || `Floor ${currentFloorIndex + 1}`}
        </span>
        <Button variant="ghost" size="sm" onClick={goDown} disabled={currentFloorIndex <= 0}>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas */}
      <CanvasLayer
        floor={currentFloor!}
        readOnly={readOnly}
        onDrawCreate={onDrawCreate}
        onDrawDelete={onDrawDelete}
      />
    </div>
  );
}
