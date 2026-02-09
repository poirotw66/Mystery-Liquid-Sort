import { BottleData, Color, Layer, Order } from '../types';
import { getCapacityForLevel, LEVEL_COLORS } from '../constants';

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
 * Shuffles the liquids in incomplete bottles with fragmentation-aware placement.
 * Avoids creating consecutive same-color layers to make puzzles harder.
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

  // 4. Fragmentation-aware distribution: place each layer in a way that maximizes color transitions
  for (const layer of allLayers) {
    const validBottles = newBottleStates.filter(b => b.layers.length < b.capacity);

    if (validBottles.length > 0) {
      // Score each bottle: prefer bottles where top color is different
      let bestBottle = validBottles[0];
      let bestScore = -Infinity;

      for (const bottle of validBottles) {
        let score = 0;

        if (bottle.layers.length === 0) {
          score = 5; // Empty bottle is neutral
        } else {
          const topColor = bottle.layers[bottle.layers.length - 1].color;
          if (topColor !== layer.color) {
            score = 20; // Different color = good fragmentation
          } else {
            score = -25; // Same color = bad, creates consecutive run
          }
        }

        // Add slight randomness to avoid deterministic patterns
        score += Math.random() * 4;

        if (score > bestScore) {
          bestScore = score;
          bestBottle = bottle;
        }
      }

      bestBottle.layers.push(layer);
    }
  }

  // 5. Update visibility: only hide at color boundaries so ? is not trivially same as neighbor
  newBottleStates.forEach(b => {
    b.layers.forEach((l, idx) => {
      if (idx === b.layers.length - 1) {
        l.isHidden = false;
      } else {
        const layerAbove = b.layers[idx + 1];
        const isAtBoundary = l.color !== layerAbove.color;
        l.isHidden = isAtBoundary && Math.random() < 0.5;
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
  const moves: { source: BottleData, target: BottleData }[] = [];
  const active = bottles.filter(b => !b.isCompleted);
  const nonEmpty = active.filter(b => b.layers.length > 0);

  for (const s of nonEmpty) {
    // Cannot pour if top is hidden
    if (s.layers[s.layers.length - 1].isHidden) continue;

    for (const t of active) {
      if (s.id === t.id) continue;
      if (canPour(s, t)) moves.push({ source: s, target: t });
    }
  }
  return moves;
};

// --- Difficulty depth: local BFS to estimate "decision depth" ---

const BFS_MAX_DEPTH = 8;
const DEPTH_CHECK_INTERVAL = 6;
const MIN_SCRAMBLE_STEPS = 15;

/** Unique key for (bottles, orders) for BFS visited set. */
function getStateKey(bottles: BottleData[], orders: Order[]): string {
  const bottlesHash = getGameStateHash(bottles);
  const orderSig = orders.map(o => `${o.isCompleted ? '1' : '0'}${o.isLocked ? 'L' : 'U'}`).join(',');
  return bottlesHash + '|' + orderSig;
}

/** Build orders from current bottles and activeColors (same structure as final). */
function buildOrdersFromBottles(bottles: BottleData[], activeColors: Color[]): Order[] {
  return activeColors.map((color, index) => ({
    id: uid(),
    color,
    isCompleted: bottles.some(b => b.isCompleted && b.layers.length > 0 && b.layers[0].color === color),
    isLocked: index >= 2,
  }));
}

/** After a bottle is completed and delivered: remove it and update orders. */
function applyOrderCompletion(
  bottles: BottleData[],
  orders: Order[],
  completedBottleId: string,
  completedColor: Color
): { newBottles: BottleData[]; newOrders: Order[] } {
  const firstOpenIndex = orders.findIndex(o => !o.isCompleted && !o.isLocked);
  if (firstOpenIndex === -1 || orders[firstOpenIndex].color !== completedColor) {
    return {
      newBottles: bottles.filter(b => b.id !== completedBottleId),
      newOrders: orders.map(o => ({ ...o })),
    };
  }
  const newOrders = orders.map((o, i) => {
    if (i === firstOpenIndex) return { ...o, isCompleted: true };
    if (i === firstOpenIndex + 1) return { ...o, isLocked: false };
    return { ...o };
  });
  const newBottles = bottles.filter(b => b.id !== completedBottleId);
  return { newBottles, newOrders };
}

/** Deep clone bottles for BFS (no shared references). */
function cloneBottles(bottles: BottleData[]): BottleData[] {
  return bottles.map(b => ({
    ...b,
    layers: b.layers.map(l => ({ ...l })),
  }));
}

/** Clone orders. */
function cloneOrders(orders: Order[]): Order[] {
  return orders.map(o => ({ ...o }));
}

/**
 * Local BFS: max number of orders that can be completed within maxDepth moves.
 * Used as primary difficulty metric (lower = deeper = harder).
 */
function localBFSMaxOrdersCompleted(
  bottles: BottleData[],
  orders: Order[],
  maxDepth: number = BFS_MAX_DEPTH
): number {
  const initialCompleted = orders.filter(o => o.isCompleted).length;
  let best = initialCompleted;
  const visited = new Map<string, number>();
  type Node = { bottles: BottleData[]; orders: Order[]; depth: number; completed: number };
  const queue: Node[] = [{ bottles: cloneBottles(bottles), orders: cloneOrders(orders), depth: 0, completed: initialCompleted }];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.depth > maxDepth) continue;

    const key = getStateKey(node.bottles, node.orders);
    const seen = visited.get(key);
    if (seen !== undefined && seen >= node.completed) continue;
    visited.set(key, node.completed);
    best = Math.max(best, node.completed);

    const moves = getValidMoves(node.bottles);
    for (const { source, target } of moves) {
      const src = node.bottles.find(b => b.id === source.id)!;
      const tgt = node.bottles.find(b => b.id === target.id)!;
      const { newSource, newTarget } = pourLiquid(src, tgt);

      let nextBottles = node.bottles.map(b => {
        if (b.id === newSource.id) return newSource;
        if (b.id === newTarget.id) return newTarget;
        return b;
      });
      let nextOrders = cloneOrders(node.orders);
      let nextCompleted = node.completed;

      if (newTarget.isCompleted) {
        const firstOpen = nextOrders.findIndex(o => !o.isCompleted && !o.isLocked);
        if (firstOpen !== -1 && nextOrders[firstOpen].color === newTarget.layers[0].color) {
          const result = applyOrderCompletion(nextBottles, nextOrders, newTarget.id, newTarget.layers[0].color);
          nextBottles = result.newBottles;
          nextOrders = result.newOrders;
          nextCompleted = nextOrders.filter(o => o.isCompleted).length;
        }
      }

      queue.push({
        bottles: nextBottles,
        orders: nextOrders,
        depth: node.depth + 1,
        completed: nextCompleted,
      });
    }
  }
  return best;
}

/** Max orders allowed to be completable in BFS window for this level (higher level = stricter = harder). */
function getMaxOrdersTargetForLevel(level: number): number {
  if (level <= 3) return 2;
  if (level <= 6) return 1;
  return 0;
}

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
const createSolvedState = (numColors: number, extraBottles: number, capacity: number) => {
  const activeColors = LEVEL_COLORS.slice(0, numColors);
  const bottles: BottleData[] = [];

  activeColors.forEach(color => {
    const layers: Layer[] = [];
    for (let i = 0; i < capacity; i++) {
      layers.push(createLayer(color, false));
    }
    bottles.push({
      id: uid(),
      layers,
      capacity,
      isCompleted: true
    });
  });

  for (let i = 0; i < extraBottles; i++) {
    bottles.push({
      id: uid(),
      layers: [],
      capacity,
      isCompleted: false
    });
  }

  return { bottles, activeColors };
};

/**
 * Calculate the fragmentation score for a bottle configuration.
 * Higher score = more interleaved/fragmented = harder.
 * Penalizes consecutive same-color layers.
 */
function calculateFragmentationScore(bottles: BottleData[]): number {
  let score = 0;
  let penalty = 0;

  for (const bottle of bottles) {
    if (bottle.layers.length <= 1) continue;

    let transitions = 0;
    let maxRun = 1;
    let currentRun = 1;

    for (let i = 1; i < bottle.layers.length; i++) {
      if (bottle.layers[i].color !== bottle.layers[i - 1].color) {
        transitions++;
        currentRun = 1;
      } else {
        currentRun++;
        maxRun = Math.max(maxRun, currentRun);
      }
    }

    // Reward transitions (color changes)
    score += transitions * 10;

    // Heavy penalty for runs of 2 or more consecutive same color
    if (maxRun >= 2) {
      penalty += (maxRun - 1) * 25;
    }

    // Extra penalty for "2+1" pattern detection: 2 same on top + 1 or more same at bottom
    if (bottle.layers.length >= 3) {
      const topTwo = bottle.layers.slice(-2);
      const bottomPart = bottle.layers.slice(0, -2);

      if (topTwo[0].color === topTwo[1].color) {
        const topColor = topTwo[0].color;
        const bottomSameCount = bottomPart.filter(l => l.color === topColor).length;
        if (bottomSameCount >= 1) {
          penalty += 30; // Heavy penalty for 2+1 pattern
        }
      }
    }
  }

  return score - penalty;
}

/**
 * Count total consecutive same-color runs of length >= 2 across all bottles.
 */
function countBadRuns(bottles: BottleData[], maxAllowedRun: number = 1): number {
  let badRuns = 0;

  for (const bottle of bottles) {
    if (bottle.layers.length <= 1) continue;

    let currentRun = 1;
    for (let i = 1; i < bottle.layers.length; i++) {
      if (bottle.layers[i].color === bottle.layers[i - 1].color) {
        currentRun++;
        if (currentRun > maxAllowedRun) {
          badRuns++;
        }
      } else {
        currentRun = 1;
      }
    }
  }

  return badRuns;
}

/**
 * Redistribute layers using forward simulation to maximize fragmentation.
 * This is a post-scramble optimization step.
 */
function redistributeForFragmentation(bottles: BottleData[]): BottleData[] {
  // Extract all layers from non-completed bottles
  const allLayers: Layer[] = [];
  const capacities: { id: string; capacity: number }[] = [];

  for (const bottle of bottles) {
    if (!bottle.isCompleted) {
      allLayers.push(...bottle.layers);
      capacities.push({ id: bottle.id, capacity: bottle.capacity });
    }
  }

  // Shuffle layers
  for (let i = allLayers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allLayers[i], allLayers[j]] = [allLayers[j], allLayers[i]];
  }

  // Clear incomplete bottles
  const newBottles = bottles.map(b => {
    if (b.isCompleted) return b;
    return { ...b, layers: [] as Layer[] };
  });

  // Greedy placement: for each layer, pick the bottle that maximizes fragmentation
  for (const layer of allLayers) {
    let bestBottleIdx = -1;
    let bestScore = -Infinity;

    const incompleteIndices = newBottles
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => !b.isCompleted && b.layers.length < b.capacity);

    for (const { b, i } of incompleteIndices) {
      // Score: prefer different color on top (fragmentation)
      let score = 0;

      if (b.layers.length === 0) {
        score = 5; // Empty bottle is neutral
      } else {
        const topColor = b.layers[b.layers.length - 1].color;
        if (topColor !== layer.color) {
          score = 20; // Different color = good fragmentation
        } else {
          score = -30; // Same color = bad, creates run
        }
      }

      // Slight randomness to avoid deterministic patterns
      score += Math.random() * 3;

      if (score > bestScore) {
        bestScore = score;
        bestBottleIdx = i;
      }
    }

    if (bestBottleIdx >= 0) {
      newBottles[bestBottleIdx].layers.push(layer);
    }
  }

  // Update completion status
  for (const bottle of newBottles) {
    bottle.isCompleted =
      bottle.layers.length === bottle.capacity &&
      bottle.layers.length > 0 &&
      bottle.layers.every(l => l.color === bottle.layers[0].color);
  }

  return newBottles;
}

/** Number of consecutive same-color layers at the top of the bottle. */
function getTopRunLength(bottle: BottleData): number {
  if (bottle.layers.length === 0) return 0;
  const topColor = bottle.layers[bottle.layers.length - 1].color;
  let count = 0;
  for (let i = bottle.layers.length - 1; i >= 0 && bottle.layers[i].color === topColor; i--) count++;
  return count;
}

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

/**
 * Get the maximum allowed run length based on level.
 * Lower levels allow some mercy; higher levels demand perfection.
 */
function getMaxRunForLevel(level: number): number {
  if (level <= 2) return 2; // Beginner: allow up to 2 consecutive
  if (level <= 5) return 1; // Intermediate: no consecutive allowed (ideal)
  return 1; // Hard: strict no consecutive
}

export const generateLevel = (level: number): { bottles: BottleData[], orders: Order[] } => {
  // 1. Difficulty Config - ENHANCED
  let numColors = 3;
  if (level >= 3) numColors = 4;
  if (level >= 6) numColors = 5;
  if (level >= 10) numColors = 6;
  if (level >= 15) numColors = 7;
  numColors = Math.min(numColors, LEVEL_COLORS.length);

  let extraBottles = 2;
  if (level >= 4) extraBottles = 1;

  // MUCH higher scramble steps for later levels
  const baseScramble = 40;
  const perLevelScramble = 12;
  const maxScrambleSteps = baseScramble + (level * perLevelScramble);

  const capacity = getCapacityForLevel(level);
  const depthTarget = getMaxOrdersTargetForLevel(level);
  const maxRunAllowed = getMaxRunForLevel(level);

  let hiddenProbability = 0;
  if (level > 1) {
    hiddenProbability = Math.min(0.85, 0.30 + (level - 1) * 0.05);
  }

  // Retry logic: try multiple times to get a good scramble
  const MAX_GENERATION_ATTEMPTS = 5;
  let bestBottles: BottleData[] | null = null;
  let bestScore = -Infinity;
  let activeColors: Color[] = [];

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const solvedState = createSolvedState(numColors, extraBottles, capacity);
    let bottles = solvedState.bottles;
    activeColors = solvedState.activeColors;

    // 3. Random Walk Scramble - ENHANCED with stricter run control
    let lastSourceId: string | null = null;
    let stepsDone = 0;

    for (let i = 0; i < maxScrambleSteps; i++) {
      const preferredMoves: { sourceIndex: number, targetIndex: number }[] = [];
      const fallbackMoves: { sourceIndex: number, targetIndex: number }[] = [];

      bottles.forEach((source, sIdx) => {
        if (!isValidScrambleSource(source)) return;
        const sourceTopColor = source.layers[source.layers.length - 1].color;

        bottles.forEach((target, tIdx) => {
          if (sIdx === tIdx) return;
          if (target.layers.length >= target.capacity) return;
          // Stronger avoidance of back-and-forth
          if (lastSourceId && source.id === lastSourceId && Math.random() < 0.9) return;

          const targetTopColor = target.layers.length > 0 ? target.layers[target.layers.length - 1].color : null;
          const isDifferentColor = targetTopColor === null || targetTopColor !== sourceTopColor;
          const topRunAfter = isDifferentColor ? 1 : getTopRunLength(target) + 1;

          // STRICT: prefer different colors, heavily penalize same color stacking
          if (isDifferentColor) {
            preferredMoves.push({ sourceIndex: sIdx, targetIndex: tIdx });
          } else if (topRunAfter <= maxRunAllowed) {
            // Only allow same-color stacking if within limit
            fallbackMoves.push({ sourceIndex: sIdx, targetIndex: tIdx });
          }
        });
      });

      // PREFER moves that create fragmentation
      const validMoves = preferredMoves.length > 0 ? preferredMoves : fallbackMoves;
      if (validMoves.length === 0) break;

      const move = validMoves[Math.floor(Math.random() * validMoves.length)];
      const source = bottles[move.sourceIndex];
      const target = bottles[move.targetIndex];

      const layer = source.layers.pop()!;
      target.layers.push(layer);
      source.isCompleted = false;
      target.isCompleted =
        target.layers.length === target.capacity &&
        target.layers.every(l => l.color === target.layers[0].color);
      lastSourceId = target.id;
      stepsDone++;

      // Depth check: ensure "max orders completable in 8 steps" meets target for this level
      if (stepsDone >= MIN_SCRAMBLE_STEPS && stepsDone % DEPTH_CHECK_INTERVAL === 0) {
        const tempOrders = buildOrdersFromBottles(bottles, activeColors);
        const maxOrdersInWindow = localBFSMaxOrdersCompleted(bottles, tempOrders, BFS_MAX_DEPTH);
        const currentCompleted = tempOrders.filter(o => o.isCompleted).length;
        const reachableNew = maxOrdersInWindow - currentCompleted;
        if (reachableNew <= depthTarget) break;
      }
    }

    // Post-scramble: check fragmentation quality
    const badRuns = countBadRuns(bottles, maxRunAllowed);
    const fragScore = calculateFragmentationScore(bottles);

    // If too many bad runs, try redistribution
    if (badRuns > 2) {
      bottles = redistributeForFragmentation(bottles);
    }

    const finalScore = calculateFragmentationScore(bottles);
    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestBottles = bottles;
    }

    // If we have a good enough score, stop early
    if (countBadRuns(bottles, maxRunAllowed) === 0 && finalScore > 0) {
      break;
    }
  }

  let bottles = bestBottles || createSolvedState(numColors, extraBottles, capacity).bottles;

  // 4. Post-Process
  // Apply hidden only at color boundaries (layer different from the one above).
  // This avoids trivial "same color as visible neighbor" hints and makes ? actually ambiguous.
  bottles.forEach(b => {
    b.layers.forEach((l, idx) => {
      if (idx === b.layers.length - 1) {
        l.isHidden = false;
        return;
      }
      const layerAbove = b.layers[idx + 1];
      const isAtBoundary = l.color !== layerAbove.color;
      if (isAtBoundary && Math.random() < hiddenProbability) {
        l.isHidden = true;
      } else {
        l.isHidden = false;
      }
    });

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