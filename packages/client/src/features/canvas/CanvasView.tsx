import { useState, useMemo, useEffect } from 'react';
import { CanvasLayer, type LaserLineData } from './CanvasLayer';
import { Compass } from './Compass';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvas.store';
import { ZOOM_STEP } from '@tactihub/shared';
import type { ViewMode } from '@tactihub/shared';

interface MapFloor {
  id: string;
  name: string;
  floorNumber: number;
  imagePath: string;
  darkImagePath?: string | null;
  whiteImagePath?: string | null;
}

interface Floor {
  id: string;
  mapFloorId: string;
  mapFloor?: MapFloor;
  draws?: any[];
}

interface CanvasViewProps {
  floors: Floor[];
  readOnly?: boolean;
  onDrawCreate?: (floorId: string, draws: any[]) => void;
  onDrawDelete?: (drawIds: string[]) => void;
  onLaserLine?: (points: Array<{ x: number; y: number }>, color: string) => void;
  onCursorMove?: (x: number, y: number, isLaser: boolean) => void;
  peerLaserLines?: LaserLineData[];
  cursors?: Map<string, { x: number; y: number; color: string; userId: string; isLaser?: boolean }>;
}

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  blueprint: 'Blueprint',
  dark: 'Darkprint',
  white: 'Whiteprint',
};

export function CanvasView({ floors, readOnly = false, onDrawCreate, onDrawDelete, onLaserLine, onCursorMove, peerLaserLines, cursors }: CanvasViewProps) {
  const { scale, zoomTo, resetViewport, offsetX, offsetY } = useCanvasStore();

  const sortedFloors = useMemo(() =>
    [...floors].sort((a, b) => (a.mapFloor?.floorNumber ?? 0) - (b.mapFloor?.floorNumber ?? 0)),
    [floors],
  );

  const [currentFloorIndex, setCurrentFloorIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('blueprint');
  const currentFloor = sortedFloors[currentFloorIndex];

  // Check which view modes are available for the current floor
  const availableModes = useMemo<ViewMode[]>(() => {
    const mf = currentFloor?.mapFloor;
    if (!mf) return ['blueprint'];
    const modes: ViewMode[] = ['blueprint'];
    if (mf.darkImagePath) modes.push('dark');
    if (mf.whiteImagePath) modes.push('white');
    return modes;
  }, [currentFloor?.mapFloor]);

  // Get the image path for the current view mode
  const activeImagePath = useMemo(() => {
    const mf = currentFloor?.mapFloor;
    if (!mf) return undefined;
    if (viewMode === 'dark' && mf.darkImagePath) return mf.darkImagePath;
    if (viewMode === 'white' && mf.whiteImagePath) return mf.whiteImagePath;
    return mf.imagePath;
  }, [currentFloor?.mapFloor, viewMode]);

  // Reset viewport when switching floors
  useEffect(() => { resetViewport(); }, [currentFloorIndex]);

  const goUp = () => setCurrentFloorIndex((i) => Math.min(i + 1, sortedFloors.length - 1));
  const goDown = () => setCurrentFloorIndex((i) => Math.max(i - 1, 0));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'k' || e.key === 'K') goUp();
    if (e.key === 'j' || e.key === 'J') goDown();
  };

  // Zoom via buttons — zoom centered on current viewport center
  const zoomIn = () => {
    const cx = -offsetX + 600;
    const cy = -offsetY + 400;
    zoomTo(scale + ZOOM_STEP, cx, cy);
  };
  const zoomOut = () => {
    const cx = -offsetX + 600;
    const cy = -offsetY + 400;
    zoomTo(scale - ZOOM_STEP, cx, cy);
  };

  if (sortedFloors.length === 0) {
    return <div className="flex items-center justify-center h-96 text-muted-foreground">No floors available</div>;
  }

  return (
    <div className="relative h-full" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Floor switcher — top right */}
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

      {/* View mode switcher — top left (only show if more than 1 mode available) */}
      {availableModes.length > 1 && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-background/90 rounded-lg border p-1">
          {availableModes.map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'default' : 'ghost'}
              size="sm"
              className="text-xs px-2 h-7"
              onClick={() => setViewMode(mode)}
            >
              {VIEW_MODE_LABELS[mode]}
            </Button>
          ))}
        </div>
      )}

      {/* Zoom controls — bottom right */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col items-center gap-1 bg-background/90 rounded-lg border p-1">
        <Button variant="ghost" size="sm" onClick={zoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium px-2">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="sm" onClick={zoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={resetViewport}>
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Compass — bottom left */}
      <Compass />

      {/* Canvas */}
      <CanvasLayer
        floor={currentFloor!}
        readOnly={readOnly}
        onDrawCreate={onDrawCreate}
        onDrawDelete={onDrawDelete}
        onLaserLine={onLaserLine}
        onCursorMove={onCursorMove}
        peerLaserLines={peerLaserLines}
        cursors={cursors}
        activeImagePath={activeImagePath}
      />
    </div>
  );
}
