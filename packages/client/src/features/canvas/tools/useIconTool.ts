/**
 * Icon tool hook — places operator/gadget icons on the canvas.
 *
 * Uses the selectedIcon from the canvas store. If the icon has a URL,
 * it creates an icon draw with that URL. Otherwise, it falls back to
 * a colored circle with the first letter of the name.
 */

import { Tool } from '@tactihub/shared';
import { useCanvasStore } from '@/stores/canvas.store';
import { screenToCanvas } from '../rendering/viewport';

interface UseIconToolOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  floorId: string;
  onDrawCreate?: (floorId: string, draws: any[]) => void;
}

export function useIconTool({ containerRef, floorId, onDrawCreate }: UseIconToolOptions) {
  function onMouseDown(e: React.MouseEvent): boolean {
    const { tool, selectedIcon } = useCanvasStore.getState();
    if (tool !== Tool.Icon || !selectedIcon) return false;

    const rect = containerRef.current!.getBoundingClientRect();
    const { offsetX, offsetY, scale } = useCanvasStore.getState();
    const pos = screenToCanvas(e.clientX, e.clientY, rect, offsetX, offsetY, scale);

    const opIconUrl = selectedIcon.operatorIcon ? `/uploads${selectedIcon.operatorIcon}` : undefined;
    const draw: any = {
      type: 'icon',
      originX: pos.x,
      originY: pos.y,
      data: selectedIcon.url
        ? { iconUrl: `/uploads${selectedIcon.url}`, size: 20, operatorIconUrl: opIconUrl }
        : {
            iconUrl: '',
            size: 20,
            fallbackText: selectedIcon.name?.[0] ?? '?',
            fallbackColor: selectedIcon.color ?? '#888888',
            operatorIconUrl: opIconUrl,
          },
    };

    onDrawCreate?.(floorId, [draw]);
    return true;
  }

  return { onMouseDown };
}
