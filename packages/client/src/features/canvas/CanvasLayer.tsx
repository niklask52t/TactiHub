import { useRef, useEffect, useState, useCallback } from 'react';
import { useCanvasStore } from '@/stores/canvas.store';
import { Tool, ZOOM_STEP } from '@tactihub/shared';
import { hitTestDraw } from './utils/hitTest';

interface Floor {
  id: string;
  mapFloorId: string;
  mapFloor?: { id: string; name: string; floorNumber: number; imagePath: string; darkImagePath?: string | null; whiteImagePath?: string | null };
  draws?: any[];
}

export interface LaserLineData {
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
  onLaserLine?: (points: Array<{ x: number; y: number }>, color: string) => void;
  onCursorMove?: (x: number, y: number, isLaser: boolean) => void;
  peerDraws?: any[];
  peerLaserLines?: LaserLineData[];
  cursors?: Map<string, { x: number; y: number; color: string; userId: string; isLaser?: boolean }>;
  activeImagePath?: string;
}

export function CanvasLayer({ floor, readOnly = false, onDrawCreate, onDrawDelete, onLaserLine, onCursorMove, peerDraws, peerLaserLines, cursors, activeImagePath }: CanvasLayerProps) {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { tool, color, lineWidth, fontSize, offsetX, offsetY, scale, zoomTo, panBy } = useCanvasStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPosRef = useRef<{ x: number; y: number } | null>(null);
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

  // Laser pointer state
  const laserPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const [laserFadeLines, setLaserFadeLines] = useState<Array<{ points: Array<{ x: number; y: number }>; color: string; fadeStart: number }>>([]);
  const laserThrottleRef = useRef(0);

  // Resolve the image path: prefer activeImagePath prop, fall back to floor.mapFloor.imagePath
  const resolvedImagePath = activeImagePath ?? floor.mapFloor?.imagePath;

  // Load background image
  useEffect(() => {
    if (!resolvedImagePath || !bgCanvasRef.current) return;
    const ctx = bgCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setCanvasSize({ width: img.width, height: img.height });
      bgCanvasRef.current!.width = img.width;
      bgCanvasRef.current!.height = img.height;
      drawCanvasRef.current!.width = img.width;
      drawCanvasRef.current!.height = img.height;
      activeCanvasRef.current!.width = img.width;
      activeCanvasRef.current!.height = img.height;
      ctx.drawImage(img, 0, 0);
      renderDraws();
    };
    img.src = `/uploads${resolvedImagePath}`;
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
      renderDraw(ctx, draw);
    }
  }, [floor.draws, peerDraws]);

  useEffect(() => { renderDraws(); }, [renderDraws]);

  function renderDraw(ctx: CanvasRenderingContext2D, draw: any) {
    const data = draw.data || {};
    ctx.save();

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
        if (data.iconUrl) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const s = data.size || 32;
            ctx.drawImage(img, draw.originX - s / 2, draw.originY - s / 2, s, s);
          };
          img.src = data.iconUrl;
        }
        break;
      }
    }
    ctx.restore();
  }

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
  }, [cursors, isDrawing, currentPath, color, lineWidth, laserFadeLines, peerLaserLines]);

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
    // Pan: middle-click or Pan tool
    if (e.button === 1 || (tool === Tool.Pan && !readOnly)) {
      e.preventDefault();
      setIsPanning(true);
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (readOnly) return;

    // Eraser: click to delete
    if (tool === Tool.Eraser) {
      const pos = getCanvasCoords(e);
      const allDraws = [...(floor.draws || []), ...(peerDraws || [])];
      for (let i = allDraws.length - 1; i >= 0; i--) {
        if (allDraws[i]!.id && hitTestDraw(allDraws[i]!, pos.x, pos.y)) {
          onDrawDelete?.([allDraws[i]!.id]);
          return;
        }
      }
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
        const iconUrl = selectedIcon.url ? `/uploads${selectedIcon.url}` : '';
        const draw = {
          type: 'icon',
          originX: pos.x,
          originY: pos.y,
          data: { iconUrl, size: 40 },
        };
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

    // Emit cursor position for all tools (with laser flag for LaserDot)
    {
      const pos = getCanvasCoords(e);
      onCursorMove?.(pos.x, pos.y, tool === Tool.LaserDot);
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

    if (!isDrawing || readOnly) return;
    const pos = getCanvasCoords(e);
    setIsDrawing(false);

    // LaserLine: send final points and start fade
    if (tool === Tool.LaserLine) {
      const points = [...laserPointsRef.current, pos];
      onLaserLine?.(points, color);
      // Add to local fade lines
      if (points.length > 1) {
        setLaserFadeLines((prev) => [...prev, { points, color, fadeStart: Date.now() }]);
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
    }

    setCurrentPath([]);
    setStartPoint(null);
  };

  const getCursorStyle = (): string => {
    if (readOnly) return 'default';
    if (isPanning) return 'grabbing';
    if (tool === Tool.Pan) return 'grab';
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
          width={canvasSize.width}
          height={canvasSize.height}
          style={{ imageRendering: 'auto', position: 'absolute', inset: 0 }}
        />
        <canvas
          ref={drawCanvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          style={{ position: 'absolute', inset: 0 }}
        />
        <canvas
          ref={activeCanvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          style={{ position: 'absolute', inset: 0, cursor: getCursorStyle() }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (isPanning) {
              setIsPanning(false);
              lastPanPosRef.current = null;
            }
            if (isDrawing) {
              setIsDrawing(false);
              setCurrentPath([]);
              setStartPoint(null);
            }
          }}
        />
      </div>
    </div>
  );
}
