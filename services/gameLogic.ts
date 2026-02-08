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
  if (source.id === target.id) return false;
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
 * Reveals all hidden layers in all bottles and recalculates completion status
 */
export const revealHiddenLayers = (bottles: BottleData[]): BottleData[] => {
    return bottles.map(bottle => {
        const newLayers = bottle.layers.map(layer => ({
            ...layer,
            isHidden: false
        }));

        const isCompleted = 
            newLayers.length === bottle.capacity && 
            newLayers.length > 0 &&
            newLayers.every(l => l.color === newLayers[0].color);

        return {
            ...bottle,
            layers: newLayers,
            isCompleted
        };
    });
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
  const newBottleStates = incompleteBottles.map(b => ({
    ...b,
    layers: [] as Layer[]
  }));

  // 4. Distribute layers randomly into available space
  // Logic: Randomly pick a valid bottle for each layer
  for (const layer of allLayers) {
      const validBottles = newBottleStates.filter(b => b.layers.length < b.capacity);
      
      if (validBottles.length > 0) {
        const randomBottle = validBottles[Math.floor(Math.random() * validBottles.length)];
        randomBottle.layers.push(layer);
      }
  }

  // 5. Update visibility
  newBottleStates.forEach(b => {
       b.layers.forEach((l, idx) => {
          if (idx === b.layers.length - 1) {
              l.isHidden = false;
          } else {
              l.isHidden = Math.random() < 0.4;
          }
       });
  });

  // 6. Merge back
  return bottles.map(b => {
      if (b.isCompleted) return b;
      
      const updated = newBottleStates.find(nb => nb.id === b.id);
      
      if (updated) {
          const isCompleted = 
            updated.layers.length === updated.capacity && 
            updated.layers.every(l => l.color === updated.layers[0].color && !l.isHidden);
            
          return { ...updated, isCompleted };
      }

      return updated || b;
  });
};

/**
 * Generates a string hash representing the current bottle configuration.
 * Used to detect loops (repeated states).
 */
export const getGameStateHash = (bottles: BottleData[]): string => {
  // Sort to ensure bottle order in array doesn't affect hash
  // (though bottle IDs are static, sorting ensures robustness)
  return bottles
    .slice() // Clone before sort
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(b => {
      // Create a string for each bottle: "ID:[Color-Hidden,Color-Visible...]"
      const layersStr = b.layers
        .map(l => `${l.color}-${l.isHidden ? 'h' : 'v'}`)
        .join(',');
      return `${b.id}:[${layersStr}]`;
    })
    .join('|');
};

/**
 * Get all theoretically valid moves from a specific state
 */
const getValidMoves = (bottles: BottleData[]) => {
    const moves: {source: BottleData, target: BottleData}[] = [];
    const active = bottles.filter(b => !b.isCompleted);
    const nonEmpty = active.filter(b => b.layers.length > 0);
    
    for (const s of nonEmpty) {
          // Cannot pour if top is hidden
          if (s.layers[s.layers.length-1].isHidden) continue;
          
          for (const t of active) {
              if (s.id === t.id) continue;
              if (canPour(s, t)) moves.push({source: s, target: t});
          }
    }
    return moves;
};

/**
 * Checks if there are any valid moves remaining.
 * Now includes a lookahead to detect forced loops (Back-and-Forth deadlocks).
 */
export const checkDeadlock = (bottles: BottleData[], history: { bottles: BottleData[] }[] = []): boolean => {
  // 1. Get immediate valid moves
  const currentMoves = getValidMoves(bottles);
  if (currentMoves.length === 0) return true; // Strict deadlock (no moves physically possible)

  // 2. Prepare History Hashes (including current state)
  const currentHash = getGameStateHash(bottles);
  const historyHashes = new Set(history.map(h => getGameStateHash(h.bottles)));
  historyHashes.add(currentHash);

  // 3. Lookahead Simulation (Is there at least ONE move that leads to a viable future?)
  const hasViablePath = currentMoves.some(move => {
      // A. Simulate the immediate move (Current -> Next)
      const { newSource, newTarget } = pourLiquid(move.source, move.target);
      
      const nextStateBottles = bottles.map(b => {
          if (b.id === newSource.id) return newSource;
          if (b.id === newTarget.id) return newTarget;
          return b;
      });

      // B. Check if Next State is a known past state (Immediate Loop)
      const nextHash = getGameStateHash(nextStateBottles);
      if (historyHashes.has(nextHash)) return false; // This move creates a loop, not viable

      // C. Check if Next State is a Dead End
      const nextMoves = getValidMoves(nextStateBottles);
      if (nextMoves.length === 0) {
          // Only exception: If the next state wins the game, it's valid!
          const isWin = nextStateBottles.every(b => b.isCompleted || b.layers.length === 0);
          return isWin; 
      }

      // D. Deep Check: Do ALL moves from Next State lead back to history? (The "Back and Forth" trap)
      // We check if "Next State" only allows moves that return to "Current State" (or other past states)
      const movesFromNextAreAllLoops = nextMoves.every(nextMove => {
          const { newSource: deepSource, newTarget: deepTarget } = pourLiquid(nextMove.source, nextMove.target);
          const deepStateBottles = nextStateBottles.map(b => {
              if (b.id === deepSource.id) return deepSource;
              if (b.id === deepTarget.id) return deepTarget;
              return b;
          });
          const deepHash = getGameStateHash(deepStateBottles);
          return historyHashes.has(deepHash);
      });

      if (movesFromNextAreAllLoops) return false; // Next state is a trap (forced loop)

      // If we passed all checks, this move is viable
      return true;
  });

  return !hasViablePath;
};

/**
 * Checks if the current bottle state exists in the history stack.
 */
export const checkStateRepetition = (currentBottles: BottleData[], history: { bottles: BottleData[] }[]): boolean => {
    if (history.length === 0) return false;
    
    const currentHash = getGameStateHash(currentBottles);
    
    // Check if this hash exists in history
    for (let i = history.length - 1; i >= 0; i--) {
        if (getGameStateHash(history[i].bottles) === currentHash) {
            return true;
        }
    }
    return false;
};

// --- NEW GENERATION LOGIC ---

/**
 * Creates the initial solved state for generation.
 */
const createSolvedState = (numColors: number, extraBottles: number) => {
    const activeColors = LEVEL_COLORS.slice(0, numColors);
    const bottles: BottleData[] = [];
    
    // Create Full Bottles
    activeColors.forEach(color => {
        const layers: Layer[] = [];
        for (let i = 0; i < MAX_CAPACITY; i++) {
            layers.push(createLayer(color, false));
        }
        bottles.push({
            id: uid(),
            layers,
            capacity: MAX_CAPACITY,
            isCompleted: true // Initially completed
        });
    });

    // Create Empty Bottles
    for (let i = 0; i < extraBottles; i++) {
        bottles.push({
            id: uid(),
            layers: [],
            capacity: MAX_CAPACITY,
            isCompleted: false
        });
    }

    return { bottles, activeColors };
};

/**
 * Checks if taking the top layer from `bottle` is a valid "Reverse Move".
 * Valid if the bottle is "pure" at the top (removing top doesn't expose a mismatch).
 * This guarantees that in the forward game, putting the layer BACK is a valid move.
 */
const isValidScrambleSource = (bottle: BottleData): boolean => {
    if (bottle.layers.length === 0) return false;
    // If only 1 layer, removing it leaves empty. Valid forward target.
    if (bottle.layers.length === 1) return true;
    
    const top = bottle.layers[bottle.layers.length - 1];
    const below = bottle.layers[bottle.layers.length - 2];
    
    // If top color matches below color, removing top leaves a matching color. Valid forward target.
    return top.color === below.color;
};

export const generateLevel = (level: number): { bottles: BottleData[], orders: Order[] } => {
    // 1. Difficulty Config
    let numColors = 3;
    if (level >= 3) numColors = 4;
    if (level >= 6) numColors = 5;
    if (level >= 10) numColors = 6;
    if (level >= 15) numColors = 7;
    numColors = Math.min(numColors, LEVEL_COLORS.length);

    let extraBottles = 2;
    if (level >= 4) extraBottles = 1;

    // Steps increase with difficulty to mix more thoroughly
    const scrambleSteps = 25 + (level * 6); 

    // Hidden Probability
    let hiddenProbability = 0;
    if (level > 1) {
        hiddenProbability = Math.min(0.5, 0.2 + (level - 2) * 0.05);
    }

    // 2. Init Solved State
    let { bottles, activeColors } = createSolvedState(numColors, extraBottles);

    // 3. Random Walk Scramble (Reverse Generation)
    let lastSourceId: string | null = null;

    for (let i = 0; i < scrambleSteps; i++) {
        // Find all valid moves for this step
        const validMoves: { sourceIndex: number, targetIndex: number }[] = [];

        bottles.forEach((source, sIdx) => {
            // Rule: We can only pick a layer from a stack if it doesn't break color continuity
            if (!isValidScrambleSource(source)) return;

            bottles.forEach((target, tIdx) => {
                if (sIdx === tIdx) return;
                if (target.layers.length >= target.capacity) return;
                
                // Heuristic: Avoid immediately moving back to where we just came from
                // to promote better mixing, but allow it if it's the only option.
                if (lastSourceId && source.id === lastSourceId && Math.random() < 0.8) {
                     return;
                }
                
                validMoves.push({ sourceIndex: sIdx, targetIndex: tIdx });
            });
        });

        if (validMoves.length === 0) break; 

        // Pick random move
        const move = validMoves[Math.floor(Math.random() * validMoves.length)];
        const source = bottles[move.sourceIndex];
        const target = bottles[move.targetIndex];

        // Execute Move (Move 1 layer at a time for maximum entropy)
        const layer = source.layers.pop()!;
        target.layers.push(layer);
        
        // Mark as incomplete since we touched them
        source.isCompleted = false; 
        target.isCompleted = false; 

        // The target of this scramble move becomes the 'source' if we were to reverse (solve) it immediately
        lastSourceId = target.id; 
    }

    // 4. Post-Process
    // Apply Hidden Layers & Final completion check
    bottles.forEach(b => {
        b.layers.forEach((l, idx) => {
             // Never hide top layer
             if (idx === b.layers.length - 1) {
                 l.isHidden = false;
                 return;
             }
             if (Math.random() < hiddenProbability) {
                 l.isHidden = true;
             } else {
                 l.isHidden = false;
             }
        });
        
        // Recalculate isCompleted logic properly
        if (b.layers.length === b.capacity && b.layers.length > 0) {
            const color = b.layers[0].color;
            b.isCompleted = b.layers.every(l => l.color === color && !l.isHidden);
        } else {
            b.isCompleted = false;
        }
    });

    // Create Orders based on active colors
    const orders: Order[] = activeColors.map((color, index) => ({
        id: uid(),
        color: color,
        // If the RNG accidentally left a bottle solved, mark order as done
        isCompleted: bottles.some(b => b.isCompleted && b.layers[0].color === color),
        isLocked: index >= 2
    }));
    
    return { bottles, orders };
};

export const checkLevelComplete = (bottles: BottleData[], orders: Order[]) => {
    return orders.every(o => o.isCompleted);
};