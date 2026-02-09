import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Zap, X, Trophy, Map, Star, ClipboardList, Heart } from 'lucide-react';
import { Bottle } from './Bottle';
import { BottleData, Color, DailyMission } from '../types';
import { createLayer } from '../services/gameLogic';
import { loadDailyMissions, saveDailyMissions, hasUnclaimedRewards } from '../services/missionService';
import { DailyMissions } from './DailyMissions';
import { INITIAL_COINS } from '../constants';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);

  // --- Missions & Coins State ---
  const [missions, setMissions] = useState<DailyMission[]>(() => loadDailyMissions());
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [coins, setCoins] = useState<number>(() => {
      const saved = localStorage.getItem('mls_coins');
      return saved ? parseInt(saved, 10) : INITIAL_COINS;
  });

  const hasNotifications = useMemo(() => hasUnclaimedRewards(missions), [missions]);

  // Handle claiming missions directly from Home
  const handleClaimMission = (missionId: string) => {
      setMissions(prev => {
          const updated = prev.map(m => {
              if (m.id === missionId && !m.isClaimed && m.progress >= m.target) {
                  // Update Coins locally and in storage
                  const newCoins = coins + m.reward;
                  setCoins(newCoins);
                  localStorage.setItem('mls_coins', newCoins.toString());
                  
                  return { ...m, isClaimed: true };
              }
              return m;
          });
          saveDailyMissions(updated);
          return updated;
      });
  };

  // Get saved level for "Continue" text
  const savedLevel = parseInt(localStorage.getItem('mls_level') || '1', 10);

  // Decorative bottles data
  const decorativeBottles: BottleData[] = [
    {
        id: 'dec-1',
        capacity: 4,
        isCompleted: true,
        layers: [
            createLayer(Color.PURPLE),
            createLayer(Color.PURPLE),
            createLayer(Color.PURPLE),
            createLayer(Color.PURPLE)
        ]
    },
    {
        id: 'dec-2',
        capacity: 4,
        isCompleted: false,
        layers: [
            createLayer(Color.BLUE),
            createLayer(Color.RED),
            createLayer(Color.YELLOW),
            createLayer(Color.GREEN)
        ]
    },
    {
        id: 'dec-3',
        capacity: 4,
        isCompleted: true,
        layers: [
            createLayer(Color.CYAN),
            createLayer(Color.CYAN),
            createLayer(Color.CYAN),
            createLayer(Color.CYAN)
        ]
    }
  ];

  const handleAdventureClick = () => {
      navigate('/game', { state: { mode: 'adventure' } });
  };

  const handleQuickPlayClick = (difficultyLevel: number, label: string) => {
      navigate('/game', { state: { mode: 'quick_play', difficultyLevel, difficultyLabel: label } });
  };

  return (
    <div className="relative w-full h-screen bg-[#1a1a2e] flex flex-col items-center justify-center text-white overflow-hidden font-sans">
        
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2a1b3d] to-[#0f0f1a] z-0"></div>
        <div className="absolute top-0 left-0 right-0 h-[60%] bg-[radial-gradient(circle_at_50%_0%,rgba(100,50,255,0.2),transparent_70%)] pointer-events-none z-0"></div>

        {/* --- Top Right UI (Coins & Missions) --- */}
        <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
             {/* Coins Badge */}
             <div className="flex items-center bg-black/30 backdrop-blur-md rounded-full pl-1.5 pr-4 py-1.5 border border-white/10 shadow-lg animate-fade-in-down">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center mr-2 shadow-inner border border-yellow-200">
                   <Heart className="w-4 h-4 text-white fill-white drop-shadow-sm" />
                </div>
                <span className="text-white font-bold text-lg tabular-nums tracking-wide">{coins}</span>
              </div>

              {/* Missions Button */}
              <button 
                  onClick={() => setShowMissionModal(true)}
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg border border-white/20 relative hover:scale-110 active:scale-95 transition-transform animate-fade-in-down"
                  style={{ animationDelay: '0.1s' }}
              >
                  <ClipboardList size={20} />
                  {hasNotifications && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#1a1a2e] animate-pulse"></span>
                  )}
              </button>
        </div>

        <div className="z-10 flex flex-col items-center space-y-8 w-full max-w-md px-4">
            
            {/* Title Section */}
            <div className="text-center space-y-2 animate-fade-in-down">
                <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] tracking-tight">
                    MYSTERY
                </h1>
                <h2 className="text-3xl md:text-4xl font-black text-white/90 tracking-wide drop-shadow-md">
                    LIQUID SORT
                </h2>
            </div>

            {/* Visual Showcase (Smaller on mobile) */}
            <div className="flex items-end justify-center gap-6 py-4 animate-float scale-75 md:scale-100">
                <div className="transform scale-90 -rotate-6 opacity-80 blur-[1px]">
                     <Bottle bottle={decorativeBottles[0]} isSelected={false} onClick={() => {}} />
                </div>
                <div className="transform scale-110 z-10 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                    <Bottle bottle={decorativeBottles[1]} isSelected={false} onClick={() => {}} />
                </div>
                <div className="transform scale-90 rotate-6 opacity-80 blur-[1px]">
                    <Bottle bottle={decorativeBottles[2]} isSelected={false} onClick={() => {}} />
                </div>
            </div>

            {/* Main Action Buttons */}
            <div className="w-full space-y-4 animate-fade-in-up">
                
                {/* Adventure Mode Button */}
                <button 
                    onClick={handleAdventureClick}
                    className="w-full group relative px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-between shadow-[0_4px_0_#1e3a8a] active:shadow-none active:translate-y-1 transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-xl">
                            <Map className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-xl font-bold tracking-wide text-white">ADVENTURE</span>
                            <span className="text-blue-200 text-xs font-mono">
                                {savedLevel > 1 ? `CONTINUE LEVEL ${savedLevel}` : 'START JOURNEY'}
                            </span>
                        </div>
                    </div>
                    <Play className="w-6 h-6 text-white/50 group-hover:text-white transition-colors" />
                </button>

                {/* Quick Play Button */}
                <button 
                    onClick={() => setShowDifficultyModal(true)}
                    className="w-full group relative px-6 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-between shadow-[0_4px_0_#047857] active:shadow-none active:translate-y-1 transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-xl">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-xl font-bold tracking-wide text-white">QUICK PLAY</span>
                            <span className="text-emerald-100 text-xs font-mono">SELECT DIFFICULTY</span>
                        </div>
                    </div>
                    <Play className="w-6 h-6 text-white/50 group-hover:text-white transition-colors" />
                </button>

            </div>

            {/* Footer */}
            <div className="absolute bottom-4 text-white/20 text-xs">
                v1.1.0 • React Liquid Engine
            </div>
        </div>

        {/* --- MODALS --- */}
        
        {/* Daily Missions Modal */}
        <DailyMissions 
            isOpen={showMissionModal}
            onClose={() => setShowMissionModal(false)}
            missions={missions}
            onClaim={handleClaimMission}
        />

        {/* Difficulty Selection Modal */}
        {showDifficultyModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                <div className="w-full max-w-sm bg-[#2d2d44] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                    
                    {/* Close Button */}
                    <button 
                        onClick={() => setShowDifficultyModal(false)}
                        className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <h3 className="text-2xl font-black text-white mb-6 text-center">SELECT DIFFICULTY</h3>

                    <div className="space-y-3">
                        <DifficultyOption 
                            label="EASY" 
                            subLabel="3 Colors • Cap 4 • Some ?" 
                            color="bg-green-500" 
                            onClick={() => handleQuickPlayClick(4, "EASY")} 
                        />
                        <DifficultyOption 
                            label="MEDIUM" 
                            subLabel="4 Colors • Cap 5 • More ?" 
                            color="bg-yellow-500" 
                            onClick={() => handleQuickPlayClick(9, "MEDIUM")} 
                        />
                        <DifficultyOption 
                            label="HARD" 
                            subLabel="5 Colors • Cap 6 • Many ?" 
                            color="bg-orange-500" 
                            onClick={() => handleQuickPlayClick(15, "HARD")} 
                        />
                        <DifficultyOption 
                            label="EXPERT" 
                            subLabel="6 Colors • Cap 6 • Max ?" 
                            color="bg-red-600" 
                            onClick={() => handleQuickPlayClick(25, "EXPERT")} 
                        />
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

const DifficultyOption: React.FC<{ 
    label: string, 
    subLabel: string, 
    color: string, 
    onClick: () => void 
}> = ({ label, subLabel, color, onClick }) => (
    <button 
        onClick={onClick}
        className="w-full group flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all active:scale-95"
    >
        <div className="flex items-center gap-4">
            <div className={`w-3 h-12 rounded-full ${color} shadow-[0_0_10px_rgba(0,0,0,0.5)]`}></div>
            <div className="text-left">
                <div className="text-lg font-bold text-white group-hover:text-yellow-300 transition-colors">{label}</div>
                <div className="text-xs text-white/40 font-mono">{subLabel}</div>
            </div>
        </div>
        <Trophy size={18} className="text-white/20 group-hover:text-white/80 transition-colors" />
    </button>
);