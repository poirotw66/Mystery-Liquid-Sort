import { Color } from './types';

export const MAX_CAPACITY = 4;
export const INITIAL_COINS = 1200;

export const LEVEL_COLORS = [
  Color.RED,
  Color.BLUE,
  Color.GREEN,
  Color.YELLOW,
  Color.PURPLE,
  Color.ORANGE,
];

// Costs for powerups
export const COST_SHUFFLE = 100;
export const COST_UNDO = 50;
export const COST_ADD_BOTTLE = 200;
export const COST_REVEAL = 150; // Cost to reveal hidden layers
export const COST_CLEAR = 300;