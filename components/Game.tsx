import React, { useState, useEffect, useMemo } from 'react';
import { GameState, BottleData, GameMode, DailyMission, MissionType } from '../types';
import { INITIAL_COINS, getCapacityForLevel, COST_SHUFFLE, COST_REVEAL, COST_ADD_BOTTLE, COST_UNDO } from '../constants';
import { generateLevel, canPour, pourLiquid, checkLevelComplete, shuffleBottles, revealHiddenLayers, checkDeadlock, checkStateRepetition } from '../services/gameLogic';
import { loadDailyMissions, saveDailyMissions, updateMissionProgress, hasUnclaimedRewards } from '../services/missionService';
import { Bottle } from './Bottle';
import { TopBar } from './TopBar';
import { TargetArea } from './TargetArea';
import { BottomControls } from './BottomControls';
import { DailyMissions } from './DailyMissions';
import { Settings } from './Settings';
import { Background } from './Background';
import { useNavigate, useLocation } from 'react-router-dom';
import { sounds } from '../utils/sound';
import { getBackgroundByLevel, getSavedBackground } from '../utils/backgrounds';
import { AlertTriangle, Home, RotateCcw, Repeat, ClipboardList } from 'lucide-react';

export default function Game() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract initial params from navigation state
  const initialMode: GameMode = location.state?.mode || 'adventure';
  const initialDifficulty = location.state?.difficultyLevel || 1;
  const initialDifficultyLabel = location.state?.difficultyLabel || 'CUSTOM';

  // Initialize state
  const [gameState, setGameState] = useState<GameState>(() => {
    // Determine level: if adventure, load from storage. If quick play, use passed prop.
    let startLevel = 1;
    if (initialMode === 'adventure') {
        const savedLevel = localStorage.getItem('mls_level');
        startLevel = savedLevel ? parseInt(savedLevel, 10) : 1;
    } else {
        startLevel = initialDifficulty;
    }

    const savedCoins = localStorage.getItem('mls_coins');
    
    return {
      mode: initialMode,
      level: startLevel,
      difficultyLabel: initialMode === 'quick_play' ? initialDifficultyLabel : undefined,
      coins: savedCoins ? parseInt(savedCoins, 10) : INITIAL_COINS,
      bottles: [],
      orders: [],
      selectedBottleId: null,
      history: [],
      isWin: false,
    };
  });

  // --- Daily Missions State ---
  const [missions, setMissions] = useState<DailyMission[]>(() => loadDailyMissions());
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const hasNotifications = useMemo(() => hasUnclaimedRewards(missions), [missions]);

  // Intelligent Warning System
  const [warningState, setWarningState] = useState<{ type: 'deadlock' | 'loop' | null, message: string }>({ type: null, message: '' });

  // Background selection - use level-based or saved preference
  const currentBackground = useMemo(() => {
    if (gameState.mode === 'adventure') {
      return getBackgroundByLevel(gameState.level);
    }
    return getSavedBackground();
  }, [gameState.level, gameState.mode]);

  // Save coins whenever they change (shared across modes)
  useEffect(() => {
    localStorage.setItem('mls_coins', gameState.coins.toString());
  }, [gameState.coins]);

  // Save level ONLY if in ADVENTURE mode
  useEffect(() => {
    if (gameState.mode === 'adventure') {
        localStorage.setItem('mls_level', gameState.level.toString());
    }
  }, [gameState.level, gameState.mode]);

  // State to track the specific match being processed { bottleId, orderIndex }
  const [processingMatch, setProcessingMatch] = useState<{ bottleId: string; orderIndex: number } | null>(null);

  useEffect(() => {
    // Generate the initial level data based on the state level/difficulty
    startLevel(gameState.level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // --- Helper to update missions from game events ---
  const trackMissionProgress = (type: MissionType) => {
      setMissions(prev => updateMissionProgress(prev, type));
  };

  const handleClaimMission = (missionId: string) => {
      setMissions(prev => {
          const updated = prev.map(m => {
              if (m.id === missionId && !m.isClaimed && m.progress >= m.target) {
                  // Add coins
                  setGameState(gs => ({...gs, coins: gs.coins + m.reward}));
                  return { ...m, isClaimed: true };
              }
              return m;
          });
          saveDailyMissions(updated);
          return updated;
      });
  };

  // --- CALCULATE VALID TARGETS ---
  const validTargets = useMemo(() => {
      if (!gameState.selectedBottleId) return new Set<string>();

      const source = gameState.bottles.find(b => b.id === gameState.selectedBottleId);
      if (!source) return new Set<string>();

      const targets = new Set<string>();
      gameState.bottles.forEach(target => {
          if (canPour(source, target)) {
              targets.add(target.id);
          }
      });
      return targets;
  }, [gameState.selectedBottleId, gameState.bottles]);

  // --- CHECK DEADLOCK & LOOPS ---
  useEffect(() => {
    if (gameState.isWin || processingMatch) {
        setWarningState({ type: null, message: '' });
        return;
    }

    const isDeadlock = checkDeadlock(gameState.bottles, gameState.history);
    if (isDeadlock) {
        setWarningState({ 
            type: 'deadlock', 
            message: '無路可走！試試道具或重來？' 
        });
        return;
    }

    const isLooping = checkStateRepetition(gameState.bottles, gameState.history);
    if (isLooping) {
        setWarningState({ 
            type: 'loop', 
            message: '鬼打牆了？這步沒效喔！' 
        });
        return;
    }

    setWarningState({ type: null, message: '' });
  }, [gameState.bottles, gameState.history, gameState.isWin, processingMatch]);

  // --- 1. DETECTION EFFECT ---
  useEffect(() => {
    if (gameState.isWin || processingMatch) return;

    const match = findMatch(gameState.bottles, gameState.orders);

    if (match) {
        setProcessingMatch(match);
        setTimeout(() => sounds.win(), 100); 
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

            if (isWin) {
                // TRACK MISSION: WIN_LEVEL
                trackMissionProgress('WIN_LEVEL');
            }

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

  const startLevel = (levelInput: number) => {
    const { bottles, orders } = generateLevel(levelInput);
    setGameState(prev => ({
      ...prev,
      bottles: bottles,
      orders: orders,
      selectedBottleId: null,
      history: [],
      isWin: false
    }));
    setProcessingMatch(null);
    setWarningState({ type: null, message: '' });
  };

  const handleNextLevel = () => {
      sounds.pop();
      if (gameState.mode === 'adventure') {
        const nextLevel = gameState.level + 1;
        setGameState(prev => ({ ...prev, level: nextLevel }));
        startLevel(nextLevel);
      } else {
          startLevel(gameState.level);
      }
  };

  const handleRestart = () => {
      if (window.confirm("重新開始本關卡?")) {
        startLevel(gameState.level);
      }
  }

  const handleBottleClick = (bottleId: string) => {
    if (gameState.isWin || processingMatch) return;

    setGameState(prev => {
      const { selectedBottleId, bottles, orders } = prev;

      if (!selectedBottleId) {
        const bottle = bottles.find(b => b.id === bottleId);
        if (!bottle || bottle.layers.length === 0 || bottle.isCompleted) return prev;
        
        sounds.pop();
        return { ...prev, selectedBottleId: bottleId };
      }

      if (selectedBottleId === bottleId) {
        sounds.pop();
        return { ...prev, selectedBottleId: null };
      }

      const sourceIndex = bottles.findIndex(b => b.id === selectedBottleId);
      const targetIndex = bottles.findIndex(b => b.id === bottleId);
      
      if (sourceIndex === -1 || targetIndex === -1) return { ...prev, selectedBottleId: null };

      const source = bottles[sourceIndex];
      const target = bottles[targetIndex];

      if (canPour(source, target)) {
        // Valid Move
        trackMissionProgress('POUR'); // TRACK MISSION: POUR

        const historySnapshot = {
             bottles: JSON.parse(JSON.stringify(bottles)),
             orders: JSON.parse(JSON.stringify(orders))
        };
        const newHistory = [...prev.history, historySnapshot];
        
        const { newSource, newTarget } = pourLiquid(source, target);
        sounds.pour();

        let currentBottles = [...bottles];
        currentBottles[sourceIndex] = newSource;
        currentBottles[targetIndex] = newTarget;

        const isTargetNewlyCompleted = newTarget.isCompleted && !target.isCompleted;
        if (isTargetNewlyCompleted) {
             const match = findMatch(currentBottles, orders);
             if (!match) {
                 sounds.pop(); 
             }
        }

        const isWin = checkLevelComplete(currentBottles, orders);
        
        if (isWin) {
             trackMissionProgress('WIN_LEVEL');
        }

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
             sounds.pop();
             return { ...prev, selectedBottleId: bottleId };
        }
        sounds.error();
        return { ...prev, selectedBottleId: null };
      }
    });
  };

  const handleUndo = () => {
    if (processingMatch) return;
    setGameState(prev => {
      if (prev.history.length === 0) {
          sounds.error();
          return prev;
      }
      if (prev.coins < COST_UNDO) {
          sounds.error();
          return prev;
      }

      sounds.pop();
      trackMissionProgress('USE_ITEM'); // TRACK MISSION

      const previousState = prev.history[prev.history.length - 1];
      const newHistory = prev.history.slice(0, -1);
      
      return {
        ...prev,
        coins: prev.coins - COST_UNDO,
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
         if (prev.coins < COST_ADD_BOTTLE) {
             sounds.error();
             return prev;
         }
         sounds.magic();
         trackMissionProgress('USE_ITEM'); // TRACK MISSION

         const newBottle: BottleData = {
             id: Math.random().toString(),
             layers: [],
             capacity: getCapacityForLevel(prev.level),
             isCompleted: false
         };
         return {
             ...prev,
             coins: prev.coins - COST_ADD_BOTTLE,
             bottles: [...prev.bottles, newBottle]
         };
     });
  };

  const handleShuffle = () => {
      if (processingMatch) return;
      
      setGameState(prev => {
        if (prev.coins < COST_SHUFFLE) {
           sounds.error();
           return prev;
        }

        sounds.magic();
        trackMissionProgress('USE_ITEM'); // TRACK MISSION

        const historySnapshot = {
            bottles: JSON.parse(JSON.stringify(prev.bottles)),
            orders: JSON.parse(JSON.stringify(prev.orders))
        };
        const newHistory = [...prev.history, historySnapshot];

        const shuffledBottles = shuffleBottles(prev.bottles);

        return {
            ...prev,
            coins: prev.coins - COST_SHUFFLE,
            bottles: shuffledBottles,
            selectedBottleId: null,
            history: newHistory
        };
      });
  };

  const handleReveal = () => {
    if (processingMatch) return;

    setGameState(prev => {
        if (prev.coins < COST_REVEAL) {
            sounds.error();
            return prev;
        }
        
        sounds.magic();
        trackMissionProgress('USE_ITEM'); // TRACK MISSION

        const historySnapshot = {
            bottles: JSON.parse(JSON.stringify(prev.bottles)),
            orders: JSON.parse(JSON.stringify(prev.orders))
        };
        const newHistory = [...prev.history, historySnapshot];

        const revealedBottles = revealHiddenLayers(prev.bottles);

        return {
            ...prev,
            coins: prev.coins - COST_REVEAL,
            bottles: revealedBottles,
            selectedBottleId: null,
            history: newHistory
        }
    });
  };

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-between text-white overflow-hidden font-sans">
        
        {/* Dynamic Background */}
        <Background background={currentBackground} />
        
        {/* Exit / Menu Buttons */}
        <div className="absolute top-6 left-6 z-50 flex gap-3">
            <button 
                onClick={() => navigate('/')} 
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/20 transition-colors backdrop-blur-md border border-white/5"
            >
                <Home size={18} />
            </button>
             <button 
                onClick={handleRestart} 
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/20 transition-colors backdrop-blur-md border border-white/5"
            >
                <RotateCcw size={18} />
            </button>
            <button 
                onClick={() => setShowMissionModal(true)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg border border-white/20 relative"
            >
                <ClipboardList size={18} />
                {hasNotifications && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1a1a2e]"></span>
                )}
            </button>
        </div>

        <TopBar 
            level={gameState.level} 
            mode={gameState.mode}
            difficultyLabel={gameState.difficultyLabel}
            coins={gameState.coins} 
            onSettings={() => setShowSettingsModal(true)} 
        />

        <div className="flex-1 w-full max-w-lg flex flex-col items-center justify-start z-10 px-4">
            
            <TargetArea 
                orders={gameState.orders} 
            />

            {/* DYNAMIC HINT NOTIFICATION */}
            {warningState.type && !gameState.isWin && (
                <div className={`
                    animate-bounce-short mb-4 backdrop-blur-md border px-4 py-2 rounded-full flex items-center gap-2 shadow-lg transition-all
                    ${warningState.type === 'deadlock' 
                        ? 'bg-red-500/20 border-red-500/50 text-red-100' 
                        : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-100'}
                `}>
                    {warningState.type === 'deadlock' ? <AlertTriangle size={18} /> : <Repeat size={18} />}
                    <span className="text-sm font-bold">{warningState.message}</span>
                </div>
            )}

            <div className="w-full flex-1 flex items-end pb-8 relative">
               <div className="w-full flex flex-wrap justify-center gap-x-6 gap-y-8 content-end">
                  {gameState.bottles.map(bottle => (
                      <Bottle
                          key={bottle.id}
                          bottle={bottle}
                          isSelected={gameState.selectedBottleId === bottle.id}
                          isValidTarget={validTargets.has(bottle.id)}
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
            onReveal={handleReveal}
        />

        {/* --- MODALS --- */}
        <DailyMissions 
            isOpen={showMissionModal}
            onClose={() => setShowMissionModal(false)}
            missions={missions}
            onClaim={handleClaimMission}
        />

        <Settings 
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
        />

        {gameState.isWin && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
                <div className="bg-white/10 p-8 rounded-3xl border border-white/20 shadow-2xl flex flex-col items-center text-center max-w-sm mx-4">
                    <div className="text-6xl mb-4">🏆</div>
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 mb-2">
                      AWESOME!
                    </h2>
                    <p className="text-gray-300 mb-8">完成訂單！</p>
                    
                    <button 
                        onClick={handleNextLevel}
                        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform"
                    >
                        {gameState.mode === 'adventure' ? '下一關' : '再來一局'}
                    </button>
                    
                    <button 
                         onClick={() => navigate('/')}
                         className="mt-4 text-white/50 hover:text-white underline text-sm"
                    >
                        回首頁
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}
