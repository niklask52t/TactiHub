import { useRef, useEffect, useState, useCallback } from 'react';
import { useCanvasStore } from '@/stores/canvas.store';
import { Tool, ZOOM_STEP } from '@tactihub/shared';
import { hitTestDraw } from './utils/hitTest';

// Module-level icon image cache — survives re-renders and component remounts
const iconImageCache = new Map<string, HTMLImageElement>();

function getIconImage(url: string): HTMLImageElement {
  let img = iconImageCache.get(url);
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    iconImageCache.set(url, img);
  }
  return img;
}

interface Floor {
  id: string;
  mapFloorId: string;
  mapFloor?: { id: string; name: string; floorNumber: number; imagePath: string; darkImagePath?: string | null; whiteImagePath?: string | null };
  draws?: any[];
}

export interface LaserLineData {
  id: string;
  userId: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  fadeStart?: number;
}

interface CanvasLayerProps {
  floor: Floor;
  readOnly?: boolean;
  onDrawCreate?: (floorId: string, draws: any[]) => void;
  onDrawDelete?: (drawIds: string[]) => void;
  onDrawUpdate?: (drawId: string, updates: { originX: number; originY: number; destinationX?: number; destinationY?: number; data: any }) => void;
  onLaserLine?: (points: Array<{ x: number; y: number }>, color: string) => void;
  onCursorMove?: (x: number, y: number, isLaser: boolean) => void;
  peerDraws?: any[];
  peerLaserLines?: LaserLineData[];
  cursors?: Map<string, { x: number; y: number; color: string; userId: string; isLaser?: boolean }>;
  activeImagePath?: string;
  currentUserId?: string | null;
}

/** Render a single draw onto a canvas context. Exported for use in export utilities. */
export function renderDraw(ctx: CanvasRenderingContext2D, draw: any, drawsRef?: { current: () => void }) {
  const data = draw.data || {};
  ctx.save();

  // Apply rotation if present
  const rotation = data.rotation || 0;
  if (rotation) {
    const bounds = getDrawBounds(draw);
    if (bounds) {
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.translate(-cx, -cy);
    }
  }

  switch (draw.type) {
    case 'path': {
      const points = data.points || [];
      if (points.length < 2) break;
      ctx.beginPath();
      ctx.strokeStyle = data.color || '#FF0000';
      ctx.lineWidth = data.lineWidth || 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      break;
    }
    case 'line': {
      ctx.beginPath();
      ctx.strokeStyle = data.color || '#FF0000';
      ctx.lineWidth = data.lineWidth || 3;
      ctx.lineCap = 'round';
      ctx.moveTo(draw.originX, draw.originY);
      ctx.lineTo(draw.destinationX ?? draw.originX, draw.destinationY ?? draw.originY);
      ctx.stroke();
      break;
    }
    case 'rectangle': {
      ctx.strokeStyle = data.color || '#FF0000';
      ctx.lineWidth = data.lineWidth || 3;
      const w = data.width || (draw.destinationX ?? draw.originX) - draw.originX;
      const h = data.height || (draw.destinationY ?? draw.originY) - draw.originY;
      if (data.filled) {
        ctx.fillStyle = data.color || '#FF0000';
        ctx.globalAlpha = 0.3;
        ctx.fillRect(draw.originX, draw.originY, w, h);
        ctx.globalAlpha = 1;
      }
      ctx.strokeRect(draw.originX, draw.originY, w, h);
      break;
    }
    case 'text': {
      ctx.fillStyle = data.color || '#FF0000';
      ctx.font = `${data.fontSize || 16}px sans-serif`;
      ctx.fillText(data.text || '', draw.originX, draw.originY);
      break;
    }
    case 'icon': {
      const s = data.size || 32;
      if (data.iconUrl) {
        const img = getIconImage(data.iconUrl);
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, draw.originX - s / 2, draw.originY - s / 2, s, s);
        } else if (drawsRef) {
          img.onload = () => { drawsRef.current(); };
        }
      } else if (data.fallbackText) {
        ctx.beginPath();
        ctx.fillStyle = data.fallbackColor || '#888888';
        ctx.arc(draw.originX, draw.originY, s / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(s * 0.5)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(data.fallbackText, draw.originX, draw.originY);
      }
      break;
    }
  }
  ctx.restore();
}

// Resize handle constants
const HANDLE_SIZE = 8;
const HANDLE_HALF = HANDLE_SIZE / 2;
const ROTATE_HANDLE_OFFSET = 24;
type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const HANDLE_CURSORS: Record<HandleId, string> = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
  se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
};

function getHandlePositions(bounds: { x: number; y: number; width: number; height: number }): Record<HandleId | 'rotate', { x: number; y: number }> {
  const { x, y, width: w, height: h } = bounds;
  return {
    nw: { x, y }, n: { x: x + w / 2, y }, ne: { x: x + w, y },
    w: { x, y: y + h / 2 }, e: { x: x + w, y: y + h / 2 },
    sw: { x, y: y + h }, s: { x: x + w / 2, y: y + h }, se: { x: x + w, y: y + h },
    rotate: { x: x + w / 2, y: y - ROTATE_HANDLE_OFFSET },
  };
}

function hitTestHandle(mouseX: number, mouseY: number, handlePos: { x: number; y: number }, tolerance: number = HANDLE_SIZE): boolean {
  return Math.abs(mouseX - handlePos.x) <= tolerance && Math.abs(mouseY - handlePos.y) <= tolerance;
}

function applyResizeToDraw(draw: any, origBounds: { x: number; y: number; width: number; height: number }, newBounds: { x: number; y: number; width: number; height: number }): any {
  const scaleX = origBounds.width !== 0 ? newBounds.width / origBounds.width : 1;
  const scaleY = origBounds.height !== 0 ? newBounds.height / origBounds.height : 1;
  const data = { ...draw.data };

  switch (draw.type) {
    case 'path': {
      const points = (data.points || []).map((p: any) => ({
        x: newBounds.x + (p.x - origBounds.x) * scaleX,
        y: newBounds.y + (p.y - origBounds.y) * scaleY,
      }));
      return { originX: Math.round(points[0]?.x ?? draw.originX), originY: Math.round(points[0]?.y ?? draw.originY), data: { ...data, points } };
    }
    case 'line':
      return {
        originX: Math.round(newBounds.x + (draw.originX - origBounds.x) * scaleX),
        originY: Math.round(newBounds.y + (draw.originY - origBounds.y) * scaleY),
        destinationX: Math.round(newBounds.x + ((draw.destinationX ?? draw.originX) - origBounds.x) * scaleX),
        destinationY: Math.round(newBounds.y + ((draw.destinationY ?? draw.originY) - origBounds.y) * scaleY),
        data,
      };
    case 'rectangle':
      return {
        originX: Math.round(newBounds.x),
        originY: Math.round(newBounds.y),
        destinationX: Math.round(newBounds.x + newBounds.width),
        destinationY: Math.round(newBounds.y + newBounds.height),
        data: { ...data, width: Math.round(newBounds.width), height: Math.round(newBounds.height) },
      };
    case 'text': {
      const newFontSize = Math.max(8, Math.round((data.fontSize || 16) * Math.max(scaleX, scaleY)));
      return { originX: Math.round(newBounds.x), originY: Math.round(newBounds.y + newBounds.height), data: { ...data, fontSize: newFontSize } };
    }
    case 'icon': {
      const newSize = Math.max(16, Math.round(Math.max(newBounds.width, newBounds.height)));
      return { originX: Math.round(newBounds.x + newBounds.width / 2), originY: Math.round(newBounds.y + newBounds.height / 2), data: { ...data, size: newSize } };
    }
    default:
      return { originX: Math.round(newBounds.x), originY: Math.round(newBounds.y), data };
  }
}

/** Compute axis-aligned bounding box for a draw (used for selection highlight). */
export function getDrawBounds(draw: any): { x: number; y: number; width: number; height: number } | null {
  const data = draw.data || {};
  switch (draw.type) {
    case 'path': {
      const points = data.points || [];
      if (points.length === 0) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    case 'line':
      return {
        x: Math.min(draw.originX, draw.destinationX ?? draw.originX),
        y: Math.min(draw.originY, draw.destinationY ?? draw.originY),
        width: Math.abs((draw.destinationX ?? draw.originX) - draw.originX),
        height: Math.abs((draw.destinationY ?? draw.originY) - draw.originY),
      };
    case 'rectangle': {
      const w = data.width || (draw.destinationX ?? draw.originX) - draw.originX;
      const h = data.height || (draw.destinationY ?? draw.originY) - draw.originY;
      return { x: Math.min(draw.originX, draw.originX + w), y: Math.min(draw.originY, draw.originY + h), width: Math.abs(w), height: Math.abs(h) };
    }
    case 'text': {
      const fs = data.fontSize || 16;
      const approxW = (data.text || '').length * fs * 0.6;
      return { x: draw.originX, y: draw.originY - fs, width: approxW, height: fs * 1.3 };
    }
    case 'icon': {
      const s = data.size || 32;
      return { x: draw.originX - s / 2, y: draw.originY - s / 2, width: s, height: s };
    }
    default: return null;
  }
}

export function CanvasLayer({ floor, readOnly = false, onDrawCreate, onDrawDelete, onDrawUpdate, onLaserLine, onCursorMove, peerDraws, peerLaserLines, cursors, activeImagePath, currentUserId }: CanvasLayerProps) {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { tool, color, lineWidth, fontSize, offsetX, offsetY, scale, zoomTo, panBy, selectedDrawId, setSelectedDrawId, interactionMode, activeResizeHandle, setInteractionMode, setActiveResizeHandle } = useCanvasStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPosRef = useRef<{ x: number; y: number } | null>(null);
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

  // Select & drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; draw: any } | null>(null);

  // Laser pointer state
  const laserPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const [laserFadeLines, setLaserFadeLines] = useState<Array<{ id: string; points: Array<{ x: number; y: number }>; color: string; fadeStart: number }>>([]);
  const laserThrottleRef = useRef(0);

  // Local laser dot position (Issue 3: show local user's laser dot)
  const [localLaserPos, setLocalLaserPos] = useState<{ x: number; y: number } | null>(null);

  // Resolve the image path: prefer activeImagePath prop, fall back to floor.mapFloor.imagePath
  const resolvedImagePath = activeImagePath ?? floor.mapFloor?.imagePath;

  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const prevDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Keep a ref to the latest renderDraws to avoid stale closures in the image onload callback
  const renderDrawsRef = useRef<() => void>(() => {});

  // ResizeObserver: recalculate viewport centering when container size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const observer = new ResizeObserver(() => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const { width, height } = container.getBoundingClientRect();
        if (width > 0 && height > 0) {
          const store = useCanvasStore.getState();
          const { imageWidth, imageHeight } = store;
          if (imageWidth > 0 && imageHeight > 0) {
            store.setDimensions(imageWidth, imageHeight, width, height);
            store.resetViewport();
          }
        }
      }, 100);
    });

    observer.observe(container);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  // Load background image
  useEffect(() => {
    if (!resolvedImagePath) return;
    let cancelled = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled || !bgCanvasRef.current || !drawCanvasRef.current || !activeCanvasRef.current) return;
      bgImageRef.current = img;

      const dimensionsChanged =
        prevDimensionsRef.current.width !== img.width ||
        prevDimensionsRef.current.height !== img.height;

      if (dimensionsChanged) {
        // Dimensions changed (new floor or first load) — resize all canvases (this clears them)
        bgCanvasRef.current.width = img.width;
        bgCanvasRef.current.height = img.height;
        drawCanvasRef.current.width = img.width;
        drawCanvasRef.current.height = img.height;
        activeCanvasRef.current.width = img.width;
        activeCanvasRef.current.height = img.height;
        prevDimensionsRef.current = { width: img.width, height: img.height };
        setCanvasSize({ width: img.width, height: img.height });
      }

      // Always redraw background image (view mode switch swaps the image)
      const bgCtx = bgCanvasRef.current.getContext('2d');
      if (bgCtx) {
        bgCtx.clearRect(0, 0, img.width, img.height);
        bgCtx.drawImage(img, 0, 0);
      }

      // Re-render draws (use ref to avoid stale closure)
      if (dimensionsChanged) {
        renderDrawsRef.current();
      }

      // Center the image in the viewport only when dimensions change
      // Use rAF to ensure flex layout is settled before measuring container
      if (dimensionsChanged) {
        requestAnimationFrame(() => {
          const container = containerRef.current;
          if (container) {
            const store = useCanvasStore.getState();
            store.setDimensions(img.width, img.height, container.clientWidth, container.clientHeight);
            store.resetViewport();
          }
        });
      }
    };
    img.src = `/uploads${resolvedImagePath}`;

    return () => { cancelled = true; };
  }, [resolvedImagePath]);

  // Render existing draws
  const renderDraws = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allDraws = [...(floor.draws || []), ...(peerDraws || [])];
    for (const draw of allDraws) {
      if (draw.isDeleted) continue;
      ctx.save();
      // Dim others' draws
      if (currentUserId && draw.userId && draw.userId !== currentUserId) {
        ctx.globalAlpha = 0.6;
      }
      renderDraw(ctx, draw, renderDrawsRef);
      ctx.restore();

      // Selection highlight with resize/rotate handles
      if (draw.id === selectedDrawId) {
        const bounds = getDrawBounds(draw);
        if (bounds) {
          const pad = 4;
          const selBounds = { x: bounds.x - pad, y: bounds.y - pad, width: bounds.width + pad * 2, height: bounds.height + pad * 2 };

          ctx.save();
          ctx.strokeStyle = '#fd7100';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(selBounds.x, selBounds.y, selBounds.width, selBounds.height);
          ctx.restore();

          // Resize handles
          const handles = getHandlePositions(selBounds);
          ctx.save();
          ctx.fillStyle = '#fd7100';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          for (const key of Object.keys(handles) as Array<HandleId | 'rotate'>) {
            if (key === 'rotate') continue;
            const h = handles[key];
            ctx.fillRect(h.x - HANDLE_HALF, h.y - HANDLE_HALF, HANDLE_SIZE, HANDLE_SIZE);
            ctx.strokeRect(h.x - HANDLE_HALF, h.y - HANDLE_HALF, HANDLE_SIZE, HANDLE_SIZE);
          }

          // Rotate handle
          const rotH = handles.rotate;
          const topCenter = handles.n;
          ctx.beginPath();
          ctx.strokeStyle = '#fd7100';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.moveTo(topCenter.x, topCenter.y);
          ctx.lineTo(rotH.x, rotH.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(rotH.x, rotH.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#fd7100';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }, [floor.draws, peerDraws, currentUserId, selectedDrawId]);

  // Keep renderDrawsRef in sync with the latest renderDraws callback
  renderDrawsRef.current = renderDraws;

  useEffect(() => { renderDraws(); }, [renderDraws]);


  // Laser fade animation loop
  useEffect(() => {
    const allFading = [...laserFadeLines, ...(peerLaserLines?.filter((l) => l.fadeStart) || [])];
    if (allFading.length === 0) return;

    let animId: number;
    const animate = () => {
      const now = Date.now();
      setLaserFadeLines((prev) => prev.filter((l) => now - l.fadeStart < 3000));
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [laserFadeLines.length, peerLaserLines]);

  // Render cursors + active drawing preview + laser effects
  useEffect(() => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw current path preview
    if (isDrawing && currentPath.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(currentPath[0]!.x, currentPath[0]!.y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i]!.x, currentPath[i]!.y);
      }
      ctx.stroke();
    }

    // Draw local laser dot
    if (localLaserPos && tool === Tool.LaserDot) {
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.arc(localLaserPos.x, localLaserPos.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw peer cursors (with laser dot glow for laser-dot users)
    if (cursors) {
      for (const [, cursor] of cursors) {
        ctx.save();
        if (cursor.isLaser) {
          // Pulsating laser dot
          ctx.beginPath();
          ctx.fillStyle = cursor.color;
          ctx.shadowColor = cursor.color;
          ctx.shadowBlur = 15;
          ctx.arc(cursor.x, cursor.y, 6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.fillStyle = cursor.color;
          ctx.arc(cursor.x, cursor.y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Draw fading laser lines (local)
    const now = Date.now();
    for (const line of laserFadeLines) {
      const elapsed = now - line.fadeStart;
      const alpha = Math.max(0, 1 - elapsed / 3000);
      if (alpha <= 0 || line.points.length < 2) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = line.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(line.points[0]!.x, line.points[0]!.y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i]!.x, line.points[i]!.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw fading peer laser lines
    for (const line of (peerLaserLines || [])) {
      const fadeStart = line.fadeStart || now;
      const elapsed = now - fadeStart;
      const alpha = line.fadeStart ? Math.max(0, 1 - elapsed / 3000) : 1;
      if (alpha <= 0 || line.points.length < 2) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = line.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(line.points[0]!.x, line.points[0]!.y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i]!.x, line.points[i]!.y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [cursors, isDrawing, currentPath, color, lineWidth, laserFadeLines, peerLaserLines, tool, localLaserPos, isDragging]);

  // Convert screen coordinates to canvas coordinates accounting for viewport transform
  const getCanvasCoords = (e: React.MouseEvent): { x: number; y: number } => {
    const container = containerRef.current!;
    const containerRect = container.getBoundingClientRect();
    return {
      x: (e.clientX - containerRect.left - offsetX) / scale,
      y: (e.clientY - containerRect.top - offsetY) / scale,
    };
  };

  // Zoom with mouse wheel centered on cursor
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current!;
    const containerRect = container.getBoundingClientRect();
    const pivotX = e.clientX - containerRect.left;
    const pivotY = e.clientY - containerRect.top;
    const currentScale = useCanvasStore.getState().scale;
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    zoomTo(currentScale + delta, pivotX, pivotY);
  }, [zoomTo]);

  // Attach wheel handler with passive: false to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Pan: middle-click or Pan tool (always allowed, even readOnly)
    if (e.button === 1 || tool === Tool.Pan) {
      e.preventDefault();
      setIsPanning(true);
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (readOnly) return;

    // Eraser: click to delete (own draws only)
    if (tool === Tool.Eraser) {
      const pos = getCanvasCoords(e);
      const allDraws = [...(floor.draws || []), ...(peerDraws || [])];
      for (let i = allDraws.length - 1; i >= 0; i--) {
        const draw = allDraws[i]!;
        if (!draw.id || draw.isDeleted) continue;
        // Ownership check: only delete own draws
        if (currentUserId && draw.userId && draw.userId !== currentUserId) continue;
        if (hitTestDraw(draw, pos.x, pos.y)) {
          onDrawDelete?.([draw.id]);
          return;
        }
      }
      return;
    }

    // Select: test handles first, then test draws
    if (tool === Tool.Select) {
      const pos = getCanvasCoords(e);

      // If a draw is already selected, test handles first
      if (selectedDrawId) {
        const allDraws = [...(floor.draws || []), ...(peerDraws || [])];
        const selectedDraw = allDraws.find(d => d.id === selectedDrawId);
        if (selectedDraw) {
          const bounds = getDrawBounds(selectedDraw);
          if (bounds) {
            const pad = 4;
            const selBounds = { x: bounds.x - pad, y: bounds.y - pad, width: bounds.width + pad * 2, height: bounds.height + pad * 2 };
            const handles = getHandlePositions(selBounds);

            // Test rotate handle
            if (hitTestHandle(pos.x, pos.y, handles.rotate, 10)) {
              setIsDragging(true);
              setInteractionMode('rotate');
              dragStartRef.current = { x: pos.x, y: pos.y, draw: JSON.parse(JSON.stringify(selectedDraw)) };
              return;
            }

            // Test resize handles
            for (const key of Object.keys(HANDLE_CURSORS) as HandleId[]) {
              if (hitTestHandle(pos.x, pos.y, handles[key])) {
                setIsDragging(true);
                setInteractionMode('resize');
                setActiveResizeHandle(key);
                dragStartRef.current = { x: pos.x, y: pos.y, draw: JSON.parse(JSON.stringify(selectedDraw)) };
                return;
              }
            }
          }
        }
      }

      // Test draws for selection + drag move
      const allDraws = [...(floor.draws || []), ...(peerDraws || [])];
      for (let i = allDraws.length - 1; i >= 0; i--) {
        const draw = allDraws[i]!;
        if (!draw.id || draw.isDeleted) continue;
        if (currentUserId && draw.userId && draw.userId !== currentUserId) continue;
        if (hitTestDraw(draw, pos.x, pos.y)) {
          setSelectedDrawId(draw.id);
          setIsDragging(true);
          setInteractionMode('move');
          dragStartRef.current = { x: pos.x, y: pos.y, draw: JSON.parse(JSON.stringify(draw)) };
          return;
        }
      }
      setSelectedDrawId(null);
      setInteractionMode('none');
      return;
    }

    // LaserDot: no drawing, just cursor broadcast (handled by RoomPage cursor logic)
    if (tool === Tool.LaserDot) {
      return;
    }

    // Icon tool: place icon at click position
    if (tool === Tool.Icon) {
      const { selectedIcon } = useCanvasStore.getState();
      if (selectedIcon) {
        const pos = getCanvasCoords(e);
        let draw: any;
        if (selectedIcon.url) {
          draw = {
            type: 'icon',
            originX: pos.x,
            originY: pos.y,
            data: { iconUrl: `/uploads${selectedIcon.url}`, size: 40 },
          };
        } else {
          // Operator without icon: place a colored circle with initial letter
          draw = {
            type: 'icon',
            originX: pos.x,
            originY: pos.y,
            data: {
              iconUrl: '',
              size: 40,
              fallbackText: selectedIcon.name?.[0] || '?',
              fallbackColor: selectedIcon.color || '#888888',
            },
          };
        }
        // Optimistic render
        const drawCtx = drawCanvasRef.current?.getContext('2d');
        if (drawCtx) renderDraw(drawCtx, draw);
        onDrawCreate?.(floor.id, [draw]);
      }
      return;
    }

    // LaserLine: start collecting points
    if (tool === Tool.LaserLine) {
      const pos = getCanvasCoords(e);
      laserPointsRef.current = [pos];
      setIsDrawing(true);
      return;
    }

    const pos = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPoint(pos);

    if (tool === Tool.Pen) {
      setCurrentPath([pos]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Pan drag
    if (isPanning && lastPanPosRef.current) {
      const dx = e.clientX - lastPanPosRef.current.x;
      const dy = e.clientY - lastPanPosRef.current.y;
      panBy(dx, dy);
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Select tool: dragging preview (move, resize, rotate)
    if (isDragging && tool === Tool.Select && dragStartRef.current) {
      const pos = getCanvasCoords(e);
      const canvas = activeCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const original = dragStartRef.current.draw;

      if (interactionMode === 'move') {
        const dx = pos.x - dragStartRef.current.x;
        const dy = pos.y - dragStartRef.current.y;
        const preview = {
          ...original,
          originX: original.originX + dx,
          originY: original.originY + dy,
          destinationX: original.destinationX != null ? original.destinationX + dx : undefined,
          destinationY: original.destinationY != null ? original.destinationY + dy : undefined,
          data: {
            ...original.data,
            ...(original.type === 'path' && original.data.points
              ? { points: original.data.points.map((p: any) => ({ x: p.x + dx, y: p.y + dy })) }
              : {}),
          },
        };
        renderDraw(ctx, preview, renderDrawsRef);
      } else if (interactionMode === 'resize' && activeResizeHandle) {
        const origBounds = getDrawBounds(original);
        if (origBounds) {
          const pad = 4;
          const selB = { x: origBounds.x - pad, y: origBounds.y - pad, width: origBounds.width + pad * 2, height: origBounds.height + pad * 2 };
          let { x, y, width, height } = selB;

          const h = activeResizeHandle as HandleId;
          if (h.includes('w')) { const right = x + width; x = pos.x; width = right - x; }
          if (h.includes('e')) { width = pos.x - x; }
          if (h.includes('n')) { const bottom = y + height; y = pos.y; height = bottom - y; }
          if (h.includes('s')) { height = pos.y - y; }

          // Ensure minimum size
          if (width < 10) width = 10;
          if (height < 10) height = 10;

          const newBounds = { x: x + pad, y: y + pad, width: width - pad * 2, height: height - pad * 2 };
          const resized = applyResizeToDraw(original, origBounds, newBounds);
          const preview = { ...original, ...resized, data: { ...original.data, ...resized.data } };
          renderDraw(ctx, preview, renderDrawsRef);

          // Draw resize preview box
          ctx.save();
          ctx.strokeStyle = '#fd7100';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x, y, width, height);
          ctx.restore();
        }
      } else if (interactionMode === 'rotate') {
        const origBounds = getDrawBounds(original);
        if (origBounds) {
          const cx = origBounds.x + origBounds.width / 2;
          const cy = origBounds.y + origBounds.height / 2;
          const angle = Math.atan2(pos.y - cy, pos.x - cx) - Math.atan2(dragStartRef.current.y - cy, dragStartRef.current.x - cx);
          const existingRotation = original.data?.rotation || 0;
          const preview = { ...original, data: { ...original.data, rotation: existingRotation + angle } };
          renderDraw(ctx, preview, renderDrawsRef);
        }
      }
      return;
    }

    // Emit cursor position for all tools (with laser flag for LaserDot)
    {
      const pos = getCanvasCoords(e);
      onCursorMove?.(pos.x, pos.y, tool === Tool.LaserDot);

      // Track local laser dot position
      if (tool === Tool.LaserDot) {
        setLocalLaserPos(pos);
      } else if (localLaserPos) {
        setLocalLaserPos(null);
      }
    }

    if (!isDrawing || readOnly) return;
    const pos = getCanvasCoords(e);

    // LaserLine: collect points and broadcast periodically
    if (tool === Tool.LaserLine) {
      laserPointsRef.current.push(pos);
      // Throttle laser line broadcasts (~50ms)
      const now = Date.now();
      if (now - laserThrottleRef.current > 50) {
        laserThrottleRef.current = now;
        onLaserLine?.(laserPointsRef.current, color);
      }
      // Draw laser line preview on active canvas
      const canvas = activeCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx && laserPointsRef.current.length > 1) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(laserPointsRef.current[0]!.x, laserPointsRef.current[0]!.y);
          for (let i = 1; i < laserPointsRef.current.length; i++) {
            ctx.lineTo(laserPointsRef.current[i]!.x, laserPointsRef.current[i]!.y);
          }
          ctx.stroke();
          ctx.restore();
        }
      }
      return;
    }

    if (tool === Tool.Pen) {
      setCurrentPath((prev) => [...prev, pos]);
    }

    // Preview on active canvas
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (tool === Tool.Pen && currentPath.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(currentPath[0]!.x, currentPath[0]!.y);
      for (const p of currentPath) {
        ctx.lineTo(p.x, p.y);
      }
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === Tool.Line && startPoint) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === Tool.Rectangle && startPoint) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(startPoint.x, startPoint.y, pos.x - startPoint.x, pos.y - startPoint.y);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      lastPanPosRef.current = null;
      return;
    }

    // Select tool: finish drag (move, resize, rotate)
    if (isDragging && tool === Tool.Select && dragStartRef.current) {
      const pos = getCanvasCoords(e);
      setIsDragging(false);

      // Clear active canvas
      const acCanvas = activeCanvasRef.current;
      if (acCanvas) {
        const ctx = acCanvas.getContext('2d');
        ctx?.clearRect(0, 0, acCanvas.width, acCanvas.height);
      }

      const original = dragStartRef.current.draw;
      const dx = pos.x - dragStartRef.current.x;
      const dy = pos.y - dragStartRef.current.y;

      // If barely moved, treat as click-select only
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && interactionMode === 'move') {
        dragStartRef.current = null;
        setInteractionMode('none');
        setActiveResizeHandle(null);
        return;
      }

      let updates: any = null;

      if (interactionMode === 'move') {
        updates = {
          originX: Math.round(original.originX + dx),
          originY: Math.round(original.originY + dy),
          destinationX: original.destinationX != null ? Math.round(original.destinationX + dx) : undefined,
          destinationY: original.destinationY != null ? Math.round(original.destinationY + dy) : undefined,
          data: {
            ...original.data,
            ...(original.type === 'path' && original.data.points
              ? { points: original.data.points.map((p: any) => ({ x: Math.round(p.x + dx), y: Math.round(p.y + dy) })) }
              : {}),
          },
        };
      } else if (interactionMode === 'resize' && activeResizeHandle) {
        const origBounds = getDrawBounds(original);
        if (origBounds) {
          const pad = 4;
          const selB = { x: origBounds.x - pad, y: origBounds.y - pad, width: origBounds.width + pad * 2, height: origBounds.height + pad * 2 };
          let { x, y, width, height } = selB;

          const h = activeResizeHandle as HandleId;
          if (h.includes('w')) { const right = x + width; x = pos.x; width = right - x; }
          if (h.includes('e')) { width = pos.x - x; }
          if (h.includes('n')) { const bottom = y + height; y = pos.y; height = bottom - y; }
          if (h.includes('s')) { height = pos.y - y; }
          if (width < 10) width = 10;
          if (height < 10) height = 10;

          const newBounds = { x: x + pad, y: y + pad, width: width - pad * 2, height: height - pad * 2 };
          const resized = applyResizeToDraw(original, origBounds, newBounds);
          updates = { ...resized, data: { ...original.data, ...resized.data } };
        }
      } else if (interactionMode === 'rotate') {
        const origBounds = getDrawBounds(original);
        if (origBounds) {
          const cx = origBounds.x + origBounds.width / 2;
          const cy = origBounds.y + origBounds.height / 2;
          const angle = Math.atan2(pos.y - cy, pos.x - cx) - Math.atan2(dragStartRef.current.y - cy, dragStartRef.current.x - cx);
          const existingRotation = original.data?.rotation || 0;
          updates = { data: { ...original.data, rotation: existingRotation + angle } };
        }
      }

      if (updates) {
        onDrawUpdate?.(original.id, updates);
      }
      dragStartRef.current = null;
      setInteractionMode('none');
      setActiveResizeHandle(null);
      return;
    }

    if (!isDrawing || readOnly) return;
    const pos = getCanvasCoords(e);
    setIsDrawing(false);

    // LaserLine: send final points and start fade
    if (tool === Tool.LaserLine) {
      const points = [...laserPointsRef.current, pos];
      onLaserLine?.(points, color);
      // Add to local fade lines
      if (points.length > 1) {
        setLaserFadeLines((prev) => [...prev, { id: `local-${Date.now()}`, points, color, fadeStart: Date.now() }]);
      }
      laserPointsRef.current = [];
      // Clear active canvas
      const canvas = activeCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    let draw: any = null;

    if (tool === Tool.Pen && currentPath.length > 1) {
      const allPoints = [...currentPath, pos];
      draw = {
        type: 'path',
        originX: allPoints[0]!.x,
        originY: allPoints[0]!.y,
        data: { points: allPoints, color, lineWidth },
      };
    } else if (tool === Tool.Line && startPoint) {
      draw = {
        type: 'line',
        originX: startPoint.x,
        originY: startPoint.y,
        destinationX: pos.x,
        destinationY: pos.y,
        data: { color, lineWidth },
      };
    } else if (tool === Tool.Rectangle && startPoint) {
      draw = {
        type: 'rectangle',
        originX: startPoint.x,
        originY: startPoint.y,
        destinationX: pos.x,
        destinationY: pos.y,
        data: {
          width: pos.x - startPoint.x,
          height: pos.y - startPoint.y,
          color,
          lineWidth,
          filled: false,
        },
      };
    } else if (tool === Tool.Text && startPoint) {
      const text = prompt('Enter text:');
      if (text) {
        draw = {
          type: 'text',
          originX: startPoint.x,
          originY: startPoint.y,
          data: { text, color, fontSize },
        };
      }
    }

    // Optimistically render the draw on the persistent draw canvas before clearing preview
    if (draw) {
      const drawCtx = drawCanvasRef.current?.getContext('2d');
      if (drawCtx) renderDraw(drawCtx, draw);
    }

    // Clear active canvas (preview)
    const canvas = activeCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (draw && onDrawCreate) {
      onDrawCreate(floor.id, [draw]);
      // Auto-switch to Select after drawing (except Icon tool for repeated placement)
      if (tool !== Tool.Icon) {
        useCanvasStore.getState().setTool(Tool.Select);
      }
    }

    setCurrentPath([]);
    setStartPoint(null);
  };

  const getCursorStyle = (): string => {
    if (readOnly) return 'default';
    if (isPanning) return 'grabbing';
    if (tool === Tool.Pan) return 'grab';
    if (tool === Tool.Select) {
      if (isDragging) {
        if (interactionMode === 'rotate') return 'alias';
        if (interactionMode === 'resize' && activeResizeHandle) return HANDLE_CURSORS[activeResizeHandle as HandleId] || 'default';
        return 'grabbing';
      }
      return 'default';
    }
    if (tool === Tool.Eraser) return 'pointer';
    if (tool === Tool.LaserDot || tool === Tool.LaserLine) return 'crosshair';
    return 'crosshair';
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden border rounded-lg bg-black/50"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="relative"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        <canvas
          ref={bgCanvasRef}
          style={{ imageRendering: 'auto', position: 'absolute', inset: 0 }}
        />
        <canvas
          ref={drawCanvasRef}
          style={{ position: 'absolute', inset: 0 }}
        />
        <canvas
          ref={activeCanvasRef}
          style={{ position: 'absolute', inset: 0, cursor: getCursorStyle() }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (isPanning) {
              setIsPanning(false);
              lastPanPosRef.current = null;
            }
            if (isDragging) {
              setIsDragging(false);
              dragStartRef.current = null;
              setInteractionMode('none');
              setActiveResizeHandle(null);
            }
            if (isDrawing) {
              setIsDrawing(false);
              setCurrentPath([]);
              setStartPoint(null);
            }
            setLocalLaserPos(null);
          }}
        />
      </div>
    </div>
  );
}
