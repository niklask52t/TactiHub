import type { Draw } from './battleplan.js';

export enum Tool {
  Pen = 'pen',
  Line = 'line',
  Rectangle = 'rectangle',
  Text = 'text',
  Icon = 'icon',
  Eraser = 'eraser',
  Select = 'select',
  Pan = 'pan',
}

export interface CanvasState {
  draws: Draw[];
  selectedIds: string[];
  tool: Tool;
  color: string;
  lineWidth: number;
  fontSize: number;
}

export interface CanvasViewport {
  x: number;
  y: number;
  scale: number;
}
