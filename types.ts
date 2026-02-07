export enum Color {
  RED = '#ef4444',
  BLUE = '#3b82f6',
  GREEN = '#22c55e',
  YELLOW = '#eab308',
  PURPLE = '#a855f7',
  ORANGE = '#f97316',
  CYAN = '#06b6d4',
  GRAY = '#9ca3af', // Placeholder for empty
}

export interface Layer {
  color: Color;
  isHidden: boolean; // If true, displays '?'
  id: string; // Unique ID for animation keys
}

export interface BottleData {
  id: string;
  layers: Layer[];
  capacity: number;
  isCompleted: boolean; // True if full and single color
}

export interface Order {
  id: string;
  color: Color; // The color required by the customer
  isCompleted: boolean;
  isLocked: boolean; // Only visible orders can be fulfilled
}

export interface GameState {
  level: number;
  coins: number;
  bottles: BottleData[];
  orders: Order[]; // Replaces completedBottles. Tracks customer requests.
  selectedBottleId: string | null;
  history: { bottles: BottleData[], orders: Order[] }[]; // Update history structure
  isWin: boolean;
}