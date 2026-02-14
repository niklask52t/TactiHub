/**
 * EditorShell — master CSS grid layout for the r6calls-style editor.
 * Replaces StratLayout + MapCanvas wrapper.
 *
 * Grid:
 *   Row 1: TopNavBar (full width)
 *   Row 2: OperatorStrip (full width)
 *   Row 3: [SidePanel ATK] [Canvas area] [SidePanel DEF]
 */

import type { ReactNode } from 'react';
import type { ViewMode } from '@tactihub/shared';
import { TopNavBar } from './TopNavBar';
import { OperatorStrip } from './OperatorStrip';
import { SidePanel } from './SidePanel';

interface EditorShellProps {
  children: ReactNode;
  readOnly?: boolean;

  // Map + floor
  mapName?: string;
  gameSlug: string;
  floors: Array<{ name: string; floorNumber: number }>;
  currentFloorIndex: number;
  onFloorChange: (index: number) => void;

  // View mode
  viewMode: ViewMode;
  availableModes: ViewMode[];
  onViewModeChange: (mode: ViewMode) => void;

  // Actions
  onUndo?: () => void;
  onRedo?: () => void;
  onExportPng?: () => void;
  onExportPdf?: () => void;

  // Strat callbacks
  onOperatorAssign?: (slotId: string, operatorId: string | null) => void;
  onVisibilityToggle?: (slotId: string, visible: boolean) => void;
  onColorChange?: (slotId: string, color: string) => void;
  onPhaseCreate?: (name: string) => void;
  onPhaseUpdate?: (phaseId: string, name: string) => void;
  onPhaseDelete?: (phaseId: string) => void;
  onPhaseSwitch?: (phaseId: string) => void;
  onConfigChange?: (config: any) => void;

  // Slots
  headerRight?: ReactNode;
}

export function EditorShell({
  children, readOnly,
  mapName, gameSlug, floors, currentFloorIndex, onFloorChange,
  viewMode, availableModes, onViewModeChange,
  onUndo, onRedo, onExportPng, onExportPdf,
  onOperatorAssign, onVisibilityToggle, onColorChange,
  onPhaseCreate, onPhaseUpdate, onPhaseDelete, onPhaseSwitch, onConfigChange,
  headerRight,
}: EditorShellProps) {
  return (
    <div className="grid h-full overflow-hidden" style={{
      gridTemplateRows: 'auto auto 1fr',
      gridTemplateColumns: '220px 1fr 220px',
    }}>
      {/* Row 1: TopNavBar */}
      <div style={{ gridColumn: '1 / -1' }}>
        <TopNavBar
          mapName={mapName}
          floors={floors}
          currentFloorIndex={currentFloorIndex}
          onFloorChange={onFloorChange}
          viewMode={viewMode}
          availableModes={availableModes}
          onViewModeChange={onViewModeChange}
          onUndo={onUndo}
          onRedo={onRedo}
          onExportPng={onExportPng}
          onExportPdf={onExportPdf}
          onPhaseCreate={onPhaseCreate}
          onPhaseUpdate={onPhaseUpdate}
          onPhaseDelete={onPhaseDelete}
          onPhaseSwitch={onPhaseSwitch}
          onConfigChange={onConfigChange}
          headerRight={headerRight}
          readOnly={readOnly}
        />
      </div>

      {/* Row 2: OperatorStrip */}
      <div style={{ gridColumn: '1 / -1' }} className="border-b bg-background">
        <OperatorStrip
          gameSlug={gameSlug}
          readOnly={readOnly}
          onOperatorAssign={onOperatorAssign}
        />
      </div>

      {/* Row 3 col 1: ATK Side Panel */}
      <SidePanel
        side="attacker"
        readOnly={readOnly}
        onVisibilityToggle={onVisibilityToggle}
        onColorChange={onColorChange}
      />

      {/* Row 3 col 2: Canvas area */}
      <div className="relative overflow-hidden bg-black/30">
        {children}
      </div>

      {/* Row 3 col 3: DEF Side Panel */}
      <SidePanel
        side="defender"
        readOnly={readOnly}
        onVisibilityToggle={onVisibilityToggle}
        onColorChange={onColorChange}
      />
    </div>
  );
}
