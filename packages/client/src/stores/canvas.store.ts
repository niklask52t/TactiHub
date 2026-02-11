import { create } from 'zustand';
import { Tool, DEFAULT_COLOR, DEFAULT_LINE_WIDTH, DEFAULT_FONT_SIZE } from '@strathub/shared';

interface CanvasStoreState {
  tool: Tool;
  color: string;
  lineWidth: number;
  fontSize: number;
  selectedIcon: { type: 'operator' | 'gadget'; id: string; url: string } | null;
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setLineWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  setSelectedIcon: (icon: { type: 'operator' | 'gadget'; id: string; url: string } | null) => void;
}

export const useCanvasStore = create<CanvasStoreState>((set) => ({
  tool: Tool.Pen,
  color: DEFAULT_COLOR,
  lineWidth: DEFAULT_LINE_WIDTH,
  fontSize: DEFAULT_FONT_SIZE,
  selectedIcon: null,
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setLineWidth: (lineWidth) => set({ lineWidth }),
  setFontSize: (fontSize) => set({ fontSize }),
  setSelectedIcon: (selectedIcon) => set({ selectedIcon }),
}));
