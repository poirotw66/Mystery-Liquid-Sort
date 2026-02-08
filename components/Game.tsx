import React, { useState, useEffect } from 'react';
import { GameState, BottleData } from '../types';
import { INITIAL_COINS, MAX_CAPACITY, COST_SHUFFLE } from '../constants';
import { generateLevel, canPour, pourLiquid, checkLevelComplete, shuffleBottles } from '../services/gameLogic';
import { Bottle } from './Bottle';
import { TopBar } from './TopBar';
import { TargetArea } from './TargetArea';
import { BottomControls } from './BottomControls';
import { useNavigate } from 'react-router-dom';

// Sound effects (dummy functions for now)
const playPop = () => {};
const playPour = () => {};
const playWin = () => {};
const playCap = () => {}; 
const playShuffle = () => {}; 

export default function Game() {
  const navigate = useNavigate();
  
  // Initialize state with localStorage check for level and coins
  const [gameState, setGameState] = useState<GameState>(() => {
    const savedLevel = localStorage.getItem('mls_level');
    const savedCoins = localStorage.getItem('mls_coins');
    
    return {
      level: savedLevel ? parseInt(savedLevel, 10) : 1, // Start from Level 1
      coins: savedCoins ? parseInt(savedCoins, 10) : INITIAL_COINS,
      bottles: [],
      orders: [],
      selectedBottleId: null,
      history: [],
      isWin: false,
    };
  });

  // Save coins whenever they change
  useEffect(() => {
    localStorage.setItem('mls_coins', gameState.coins.toString());
  }, [gameState.coins]);

  // Save level whenever it changes
  useEffect(() => {
    localStorage.setItem('mls_level', gameState.level.toString());
  }, [gameState.level]);

  // State to track the specific match being processed { bottleId, orderIndex }
  const [processingMatch, setProcessingMatch] = useState<{ bottleId: string; orderIndex: number } | null>(null);

  useEffect(() => {
    startLevel(gameState.level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount, startLevel will handle re-generations when called manually

  // --- 1. DETECTION EFFECT ---
  useEffect(() => {
    if (gameState.isWin || processingMatch) return;

    const match = findMatch(gameState.bottles, gameState.orders);

    if (match) {
        setProcessingMatch(match);
        playWin(); 
    }
  }, [gameState.bottles, gameState.orders, gameState.isWin, processingMatch]);

  // --- 2. EXECUTION EFFECT ---
  useEffect(() => {
    if (!processingMatch) return;

    const { bottleId, orderIndex } = processingMatch;

    const timer = setTimeout(() => {
        setGameState(prev => {
            const bottleExists = prev.bottles.some(b => b.id === bottleId);
            if (!bottleExists) return prev;

            let currentBottles = [...prev.bottles];
            let currentOrders = [...prev.orders];

            if (currentOrders[orderIndex]) {
                currentOrders[orderIndex] = { ...currentOrders[orderIndex], isCompleted: true };
            }

            currentBottles = currentBottles.filter(b => b.id !== bottleId);

            const nextLockedIndex = currentOrders.findIndex(o => o.isLocked);
            if (nextLockedIndex !== -1) {
                currentOrders[nextLockedIndex] = { ...currentOrders[nextLockedIndex], isLocked: false };
            }
            
            const isWin = checkLevelComplete(currentBottles, currentOrders);

            return {
                ...prev,
                bottles: currentBottles,
                orders: currentOrders,
                isWin
            };
        });
        
        setProcessingMatch(null); 
    }, 800); 

    return () => clearTimeout(timer);
  }, [processingMatch]);

  const findMatch = (bottles: BottleData[], orders: any[]) => {
      for (let i = 0; i < orders.length; i++) {
          const order = orders[i];
          if (!order.isCompleted && !order.isLocked) {
              const bottle = bottles.find(b => 
                  b.isCompleted && 
                  b.layers.length > 0 && 
                  b.layers[0].color === order.color
              );
              if (bottle) {
                  return { bottleId: bottle.id, orderIndex: i };
              }
          }
      }
      return null;
  };

  const startLevel = (level: number) => {
    const { bottles, orders } = generateLevel(level);
    setGameState(prev => ({
      ...prev,
      level,
      bottles: bottles,
      orders: orders,
      selectedBottleId: null,
      history: [],
      isWin: false
    }));
    setProcessingMatch(null);
  };

  const handleNextLevel = () => {
      const nextLevel = gameState.level + 1;
      setGameState(prev => ({ ...prev, level: nextLevel })); // Update state logic
      startLevel(nextLevel); // Regenerate board
  };

  const handleBottleClick = (bottleId: string) => {
    if (gameState.isWin || processingMatch) return;

    setGameState(prev => {
      const { selectedBottleId, bottles, orders } = prev;

      if (!selectedBottleId) {
        const bottle = bottles.find(b => b.id === bottleId);
        if (!bottle || bottle.layers.length === 0 || bottle.isCompleted) return prev;
        
        playPop();
        return { ...prev, selectedBottleId: bottleId };
      }

      if (selectedBottleId === bottleId) {
        return { ...prev, selectedBottleId: null };
      }

      const sourceIndex = bottles.findIndex(b => b.id === selectedBottleId);
      const targetIndex = bottles.findIndex(b => b.id === bottleId);
      
      if (sourceIndex === -1 || targetIndex === -1) return { ...prev, selectedBottleId: null };

      const source = bottles[sourceIndex];
      const target = bottles[targetIndex];

      if (canPour(source, target)) {
        const historySnapshot = {
             bottles: JSON.parse(JSON.stringify(bottles)),
             orders: JSON.parse(JSON.stringify(orders))
        };
        const newHistory = [...prev.history, historySnapshot];
        
        const { newSource, newTarget } = pourLiquid(source, target);
        playPour();

        let currentBottles = [...bottles];
        currentBottles[sourceIndex] = newSource;
        currentBottles[targetIndex] = newTarget;

        const isTargetNewlyCompleted = newTarget.isCompleted && !target.isCompleted;
        if (isTargetNewlyCompleted) {
             const match = findMatch(currentBottles, orders);
             if (!match) {
                 playCap();
             }
        }

        const isWin = checkLevelComplete(currentBottles, orders);
        
        return {
          ...prev,
          bottles: currentBottles,
          selectedBottleId: null,
          history: newHistory,
          isWin
        };
      } else {
        const targetBottle = bottles[targetIndex];
        if (!targetBottle.isCompleted && targetBottle.layers.length > 0) {
             playPop();
             return { ...prev, selectedBottleId: bottleId };
        }
        return { ...prev, selectedBottleId: null };
      }
    });
  };

  const handleUndo = () => {
    if (processingMatch) return;
    setGameState(prev => {
      if (prev.history.length === 0 || prev.coins < 50) return prev; 
      const previousState = prev.history[prev.history.length - 1];
      const newHistory = prev.history.slice(0, -1);
      
      return {
        ...prev,
        coins: prev.coins - 50,
        bottles: previousState.bottles,
        orders: previousState.orders,
        selectedBottleId: null,
        history: newHistory
      };
    });
  };

  const handleAddBottle = () => {
     if (processingMatch) return;
     setGameState(prev => {
         if (prev.coins < 200) return prev;
         const newBottle: BottleData = {
             id: Math.random().toString(),
             layers: [],
             capacity: MAX_CAPACITY,
             isCompleted: false
         };
         return {
             ...prev,
             coins: prev.coins - 200,
             bottles: [...prev.bottles, newBottle]
         };
     });
  };

  const handleShuffle = () => {
      if (processingMatch) return;
      
      setGameState(prev => {
        if (prev.coins < COST_SHUFFLE) {
           return prev;
        }

        const historySnapshot = {
            bottles: JSON.parse(JSON.stringify(prev.bottles)),
            orders: JSON.parse(JSON.stringify(prev.orders))
        };
        const newHistory = [...prev.history, historySnapshot];

        const shuffledBottles = shuffleBottles(prev.bottles);
        playShuffle();

        return {
            ...prev,
            coins: prev.coins - COST_SHUFFLE,
            bottles: shuffledBottles,
            selectedBottleId: null,
            history: newHistory
        };
      });
  };

  return (
    <div className="relative w-full h-screen bg-[#1a1a2e] flex flex-col items-center justify-between text-white overflow-hidden font-sans">
        
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2a1b3d] to-[#0f0f1a] z-0"></div>
        <div className="absolute top-0 left-0 right-0 h-[60%] bg-[radial-gradient(circle_at_50%_0%,rgba(100,50,255,0.15),transparent_70%)] pointer-events-none z-0"></div>
        
        {/* Exit Button */}
        <div className="absolute top-6 left-6 z-50">
            <button 
                onClick={() => navigate('/')} 
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/20"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
        </div>

        <TopBar 
            level={gameState.level} 
            coins={gameState.coins} 
            onSettings={() => alert("Settings")} 
        />

        <div className="flex-1 w-full max-w-lg flex flex-col items-center justify-start z-10 px-4">
            
            <TargetArea 
                orders={gameState.orders} 
            />

            <div className="w-full flex-1 flex items-end pb-8 relative">
               <div className="w-full flex flex-wrap justify-center gap-x-6 gap-y-8 content-end">
                  {gameState.bottles.map(bottle => (
                      <Bottle
                          key={bottle.id}
                          bottle={bottle}
                          isSelected={gameState.selectedBottleId === bottle.id}
                          isFlying={processingMatch?.bottleId === bottle.id}
                          onClick={() => handleBottleClick(bottle.id)}
                      />
                  ))}
               </div>
            </div>
        </div>

        <BottomControls 
            onUndo={handleUndo} 
            onShuffle={handleShuffle} 
            onAddBottle={handleAddBottle}
            onClear={() => {}}
        />

        {gameState.isWin && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
                <div className="bg-white/10 p-8 rounded-3xl border border-white/20 shadow-2xl flex flex-col items-center text-center max-w-sm mx-4">
                    <div className="text-6xl mb-4">🏆</div>
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 mb-2">
                      AWESOME!
                    </h2>
                    <p className="text-gray-300 mb-8">All Orders Completed!</p>
                    
                    <button 
                        onClick={handleNextLevel}
                        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform"
                    >
                        Next Level
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}