import { useCanvasStore } from '@/stores/canvas.store';
import { Tool } from '@tactihub/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Minus, Square, Type, Move, Undo2, Redo2, Eraser, Crosshair, Presentation, MousePointer2 } from 'lucide-react';

const tools = [
  { tool: Tool.Pen, icon: Pencil, label: 'Pen' },
  { tool: Tool.Line, icon: Minus, label: 'Line' },
  { tool: Tool.Rectangle, icon: Square, label: 'Rectangle' },
  { tool: Tool.Text, icon: Type, label: 'Text' },
  { tool: Tool.Select, icon: MousePointer2, label: 'Select' },
  { tool: Tool.Eraser, icon: Eraser, label: 'Eraser' },
  { tool: Tool.Pan, icon: Move, label: 'Pan' },
];

const laserTools = [
  { tool: Tool.LaserDot, icon: Crosshair, label: 'Laser Dot' },
  { tool: Tool.LaserLine, icon: Presentation, label: 'Laser Line' },
];

interface ToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
}

export function Toolbar({ onUndo, onRedo }: ToolbarProps) {
  const { tool: activeTool, setTool, color, setColor, lineWidth, setLineWidth, fontSize, setFontSize } = useCanvasStore();

  return (
    <div className="relative flex items-center gap-1 p-2 bg-background border rounded-lg shadow-lg">
      {tools.map(({ tool, icon: Icon, label }) => (
        <Tooltip key={tool}>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === tool ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setTool(tool)}
              className="h-8 w-8"
            >
              <Icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}

      <Separator orientation="vertical" className="mx-1 h-6" />

      {laserTools.map(({ tool, icon: Icon, label }) => (
        <Tooltip key={tool}>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === tool ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setTool(tool)}
              className="h-8 w-8"
            >
              <Icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="w-8 h-8 p-0 border-0 cursor-pointer"
      />

      <Input
        type="range"
        min={1}
        max={20}
        value={lineWidth}
        onChange={(e) => setLineWidth(parseInt(e.target.value))}
        className="w-20 h-8"
      />

      {activeTool === Tool.Text && (
        <>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Select value={String(fontSize)} onValueChange={(v) => setFontSize(parseInt(v))}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[12, 16, 20, 24, 32, 48, 64].map((size) => (
                      <SelectItem key={size} value={String(size)}>{size}px</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent>Font Size</TooltipContent>
          </Tooltip>
        </>
      )}

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUndo}>
            <Undo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Undo</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRedo}>
            <Redo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Redo</TooltipContent>
      </Tooltip>
    </div>
  );
}
