import type { MapFloor, Operator } from './game.js';
import type { User } from './auth.js';

export interface Battleplan {
  id: string;
  ownerId: string;
  gameId: string;
  mapId: string;
  name: string;
  description: string | null;
  notes: string | null;
  tags: string[];
  isPublic: boolean;
  isSaved: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  floors?: BattleplanFloor[];
  operatorSlots?: OperatorSlot[];
  voteCount?: number;
  userVote?: number | null;
}

export interface BattleplanFloor {
  id: string;
  battleplanId: string;
  mapFloorId: string;
  createdAt: string;
  updatedAt: string;
  mapFloor?: MapFloor;
  draws?: Draw[];
}

export type DrawType = 'path' | 'line' | 'rectangle' | 'text' | 'icon';

export interface Draw {
  id: string;
  battleplanFloorId: string;
  userId: string | null;
  type: DrawType;
  originX: number;
  originY: number;
  destinationX: number | null;
  destinationY: number | null;
  data: DrawData;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DrawData = PathData | LineData | RectangleData | TextData | IconData;

export interface PathData {
  points: Array<{ x: number; y: number }>;
  color: string;
  lineWidth: number;
}

export interface LineData {
  color: string;
  lineWidth: number;
}

export interface RectangleData {
  width: number;
  height: number;
  color: string;
  lineWidth: number;
  filled: boolean;
}

export interface TextData {
  text: string;
  color: string;
  fontSize: number;
}

export interface IconData {
  iconType: 'operator' | 'gadget';
  iconId: string;
  iconUrl: string;
  size: number;
}

export type SlotSide = 'defender' | 'attacker';

export interface OperatorSlot {
  id: string;
  battleplanId: string;
  slotNumber: number;
  operatorId: string | null;
  side: SlotSide;
  createdAt: string;
  updatedAt: string;
  operator?: Operator | null;
}
