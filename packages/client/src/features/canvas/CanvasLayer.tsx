import { useRef, useEffect, useState, useCallback } from 'react';
import { useCanvasStore } from '@/stores/canvas.store';
import { Tool } from '@strathub/shared';

interface Floor {
  id: string;
  mapFloorId: string;
  mapFloor?: { id: string; name: string; floorNumber: number; imagePath: string };
  draws?: any[];
}

interface CanvasLayerProps {
  floor: Floor;
  readOnly?: boolean;
  onDrawCreate?: (floorId: string, draws: any[]) => void;
  onDrawDelete?: (drawIds: string[]) => void;
  peerDraws?: any[];
  cursors?: Map<string, { x: number; y: number; color: string; userId: string }>;
}

export function CanvasLayer({ floor, readOnly = false, onDrawCreate, peerDraws, cursors }: CanvasLayerProps) {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { tool, color, lineWidth, fontSize } = useCanvasStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

  // Load background image
  useEffect(() => {
    if (!floor.mapFloor?.imagePath || !bgCanvasRef.current) return;
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
    img.src = `/uploads${floor.mapFloor.imagePath}`;
  }, [floor.mapFloor?.imagePath]);

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

  // Render cursors
  useEffect(() => {
    const canvas = activeCanvasRef.current;
    if (!canvas || !cursors) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw current path
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

    // Draw peer cursors
    for (const [, cursor] of cursors) {
      ctx.beginPath();
      ctx.fillStyle = cursor.color;
      ctx.arc(cursor.x, cursor.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [cursors, isDrawing, currentPath, color, lineWidth]);

  const getCanvasCoords = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = activeCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    const pos = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPoint(pos);

    if (tool === Tool.Pen) {
      setCurrentPath([pos]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || readOnly) return;
    const pos = getCanvasCoords(e);

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
    if (!isDrawing || readOnly) return;
    const pos = getCanvasCoords(e);
    setIsDrawing(false);

    // Clear active canvas
    const canvas = activeCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
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

    if (draw && onDrawCreate) {
      onDrawCreate(floor.id, [draw]);
    }

    setCurrentPath([]);
    setStartPoint(null);
  };

  return (
    <div ref={containerRef} className="relative w-full overflow-auto border rounded-lg bg-black/50">
      <div className="relative" style={{ width: canvasSize.width, height: canvasSize.height, maxWidth: '100%' }}>
        <canvas
          ref={bgCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'auto' }}
        />
        <canvas
          ref={drawCanvasRef}
          className="absolute inset-0 w-full h-full"
        />
        <canvas
          ref={activeCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: readOnly ? 'default' : 'crosshair' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { if (isDrawing) handleMouseUp({} as any); }}
        />
      </div>
    </div>
  );
}
