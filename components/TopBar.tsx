import React from 'react';
import { Settings, Heart } from 'lucide-react';
import { GameMode } from '../types';

interface TopBarProps {
  level: number;
  mode: GameMode;
  difficultyLabel?: string;
  coins: number;
  onSettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ level, mode, difficultyLabel, coins, onSettings }) => {
  return (
    <div className="w-full flex justify-between items-center px-6 pt-6 pb-2 z-50 pointer-events-none">
      {/* Spacer for alignment with left buttons */}
      <div className="w-12"></div>

      {/* Level Indicator - Styled like a floating card */}
      <div className="flex flex-col items-center">
         <div className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-1 drop-shadow-md">
            {mode === 'adventure' ? 'LEVEL' : 'DIFFICULTY'}
         </div>
         <h1 className="text-white text-3xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] font-mono">
            {mode === 'adventure' ? level : difficultyLabel}
         </h1>
      </div>

      {/* Right: Settings + Coins (both clickable) */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {onSettings && (
          <button
            onClick={onSettings}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/20 transition-colors backdrop-blur-md border border-white/5"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        )}
        <div className="flex items-center bg-black/30 backdrop-blur-md rounded-full pl-1.5 pr-4 py-1.5 border border-white/10 shadow-lg">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center mr-2 shadow-inner border border-yellow-200">
             <Heart className="w-4 h-4 text-white fill-white drop-shadow-sm" />
          </div>
          <span className="text-white font-bold text-lg tabular-nums tracking-wide">{coins}</span>
        </div>
      </div>
    </div>
  );
};