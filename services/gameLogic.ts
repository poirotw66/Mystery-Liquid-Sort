import { BottleData, Color, Layer, Order } from '../types';
import { MAX_CAPACITY, LEVEL_COLORS } from '../constants';

// Helper to create a unique ID
const uid = () => Math.random().toString(36).substr(2, 9);

export const createLayer = (color: Color, isHidden: boolean = false): Layer => ({
  color,
  isHidden,
  id: uid(),
});

/**
 * Checks if a move is valid.
 */
export const canPour = (source: BottleData, target: BottleData): boolean => {
  if (source.layers.length === 0) return false; // Source empty
  if (target.isCompleted) return false; // Cannot pour into a completed/capped bottle
  if (target.layers.length >= target.capacity) return false; // Target full
  if (target.layers.length === 0) return true; // Target empty

  const sourceTop = source.layers[source.layers.length - 1];
  const targetTop = target.layers[target.layers.length - 1];

  // Cannot pour hidden layers
  if (sourceTop.isHidden) return false;
  
  // Must match color
  return sourceTop.color === targetTop.color;
};

/**
 * Executes a pour operation.
 * Returns new state of source and target bottles.
 */
export const pourLiquid = (
  source: BottleData, 
  target: BottleData
): { newSource: BottleData; newTarget: BottleData; movedCount: number } => {
  
  const sourceLayers = [...source.layers];
  const targetLayers = [...target.layers];
  
  const sourceTop = sourceLayers[sourceLayers.length - 1];
  const colorToMove = sourceTop.color;

  let movedCount = 0;

  // Move as many matching layers as possible
  while (
    sourceLayers.length > 0 &&
    targetLayers.length < target.capacity &&
    sourceLayers[sourceLayers.length - 1].color === colorToMove &&
    !sourceLayers[sourceLayers.length - 1].isHidden
  ) {
    const layer = sourceLayers.pop();
    if (layer) {
      targetLayers.push(layer);
      movedCount++;
    }
  }

  // Reveal the new top layer of the source if it was hidden
  if (sourceLayers.length > 0) {
    const newTopIndex = sourceLayers.length - 1;
    if (sourceLayers[newTopIndex].isHidden) {
      sourceLayers[newTopIndex] = { ...sourceLayers[newTopIndex], isHidden: false };
    }
  }

  // Check if target is completed (Full and Uniform)
  const isTargetCompleted = 
    targetLayers.length === target.capacity && 
    targetLayers.every(l => l.color === targetLayers[0].color && !l.isHidden);

  return {
    newSource: { ...source, layers: sourceLayers },
    newTarget: { ...target, layers: targetLayers, isCompleted: isTargetCompleted },
    movedCount
  };
};

/**
 * Shuffles the liquids in incomplete bottles.
 */
export const shuffleBottles = (bottles: BottleData[]): BottleData[] => {
  const incompleteBottles = bottles.filter(b => !b.isCompleted);
  
  // 1. Extract all layers from incomplete bottles
  let allLayers: Layer[] = [];
  incompleteBottles.forEach(b => {
    allLayers.push(...b.layers);
  });

  // 2. Fisher-Yates Shuffle
  for (let i = allLayers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allLayers[i], allLayers[j]] = [allLayers[j], allLayers[i]];
  }

  // 3. Clear the incomplete bottles to prepare for refill
  // We create a map for easy updates, preserving the bottle objects
  const newBottleStates = incompleteBottles.map(b => ({
    ...b,
    layers: [] as Layer[]
  }));

  // 4. Distribute layers randomly into available space
  // This helps avoid creating a trivial state where everything is sorted or blocked
  for (const layer of allLayers) {
      // Find bottles that still have space
      const validBottles = newBottleStates.filter(b => b.layers.length < b.capacity);
      
      if (validBottles.length > 0) {
        const randomBottle = validBottles[Math.floor(Math.random() * validBottles.length)];
        randomBottle.layers.push(layer);
      } else {
        // Should not happen if total capacity >= total layers
        console.warn("Not enough space to put back shuffled layers!");
      }
  }

  // 5. Update visibility (Top layer always visible, others chance to be hidden)
  newBottleStates.forEach(b => {
       b.layers.forEach((l, idx) => {
          // Top layer is always visible
          if (idx === b.layers.length - 1) {
              l.isHidden = false;
          } else {
              // 40% chance to be hidden for lower layers to maintain "Mystery"
              // Or you could make them all visible to reward the player. 
              // Let's keep the game mechanic:
              l.isHidden = Math.random() < 0.4;
          }
       });
  });

  // 6. Merge back into the original array order
  return bottles.map(b => {
      if (b.isCompleted) return b;
      const updated = newBottleStates.find(nb => nb.id === b.id);
      return updated || b;
  });
};

/**
 * Generates a level with progressive difficulty.
 */
export const generateLevel = (level: number): { bottles: BottleData[], orders: Order[] } => {
  
  // 1. Difficulty Logic: Number of Colors
  // Lvl 1-2: 3 colors
  // Lvl 3-5: 4 colors
  // Lvl 6-9: 5 colors
  // Lvl 10+: 6 colors...
  let numColors = 3;
  if (level >= 3) numColors = 4;
  if (level >= 6) numColors = 5;
  if (level >= 10) numColors = 6;
  if (level >= 15) numColors = 7;
  
  // Cap at max available colors
  numColors = Math.min(numColors, LEVEL_COLORS.length);

  // 2. Difficulty Logic: Hidden Layers Probability
  // Lvl 1: 0% hidden (Tutorial phase)
  // Lvl 2: 20%
  // Lvl 3+: Grows up to 50%
  let hiddenProbability = 0;
  if (level > 1) {
    hiddenProbability = Math.min(0.5, 0.2 + (level - 2) * 0.05);
  }

  const numEmpty = 2; // Keep at 2 for solvable seeds generally
  
  const activeColors = LEVEL_COLORS.slice(0, numColors);
  let allLayers: Layer[] = [];

  // Create orders
  // Logic: First 2 orders always unlocked. Subsequent orders locked based on difficulty.
  const orders: Order[] = activeColors.map((color, index) => ({
    id: uid(),
    color: color,
    isCompleted: false,
    isLocked: index >= 2 // Simple lock logic: Index 0 and 1 are free, others locked
  }));

  // Create 4 layers for each color
  activeColors.forEach(color => {
    for (let i = 0; i < MAX_CAPACITY; i++) {
      allLayers.push(createLayer(color, false));
    }
  });

  // Shuffle layers
  allLayers = allLayers.sort(() => Math.random() - 0.5);

  const bottles: BottleData[] = [];
  const totalBottles = numColors + numEmpty;

  // Distribute layers into bottles
  let layerIndex = 0;
  for (let i = 0; i < totalBottles; i++) {
    const isEmptyBottle = i >= numColors;
    const layers: Layer[] = [];
    
    if (!isEmptyBottle) {
      for (let j = 0; j < MAX_CAPACITY; j++) {
        if (layerIndex < allLayers.length) {
          const layer = allLayers[layerIndex++];
          
          // Apply Hidden Logic
          // Rule: Topmost layer (index 3) is never initially hidden for fairness
          // Rule: Bottom layers have chance to be hidden
          const isTopLayer = j === 3; 
          
          if (!isTopLayer && Math.random() < hiddenProbability) {
            layer.isHidden = true;
          } else {
            layer.isHidden = false;
          }
          layers.push(layer);
        }
      }
    }

    bottles.push({
      id: uid(),
      layers,
      capacity: MAX_CAPACITY,
      isCompleted: false,
    });
  }

  // Double check: Ensure visual top layers are revealed (in case logic above missed something)
  bottles.forEach(b => {
    if (b.layers.length > 0) {
      b.layers[b.layers.length - 1].isHidden = false;
    }
  });

  return { bottles, orders };
};

export const checkLevelComplete = (bottles: BottleData[], orders: Order[]) => {
    // Win condition: All orders are completed.
    return orders.every(o => o.isCompleted);
};