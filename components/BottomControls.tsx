import React from 'react';
import { RotateCcw, Shuffle, Plus, Eye } from 'lucide-react';
import { COST_ADD_BOTTLE, COST_REVEAL, COST_SHUFFLE, COST_UNDO } from '../constants';

interface BottomControlsProps {
  onShuffle: () => void;
  onUndo: () => void;
  onAddBottle: () => void;
  onReveal: () => void;
}

const ControlButton: React.FC<{ 
  onClick: () => void; 
  icon: React.ReactNode; 
  colorClass: string;
  cost: number;
  label: string;
}> = ({ onClick, icon, colorClass, cost, label }) => (
  <div className="flex flex-col items-center gap-1 group">
    <button
      onClick={onClick}
      className={`
        relative w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl
        shadow-[0_6px_0_rgba(0,0,0,0.3)] border-b-4 border-black/20
        transition-all duration-100 ease-in-out
        active:shadow-none active:translate-y-1.5 active:border-b-0
        hover:brightness-110
        ${colorClass}
      `}
    >
      <div className="drop-shadow-md">{icon}</div>
      
      {/* Glossy top highlight */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl pointer-events-none"></div>
    </button>
    
    {/* Price Tag */}
    <div className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10 group-active:translate-y-1 transition-transform">
      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
      <span className="text-[10px] font-bold text-white">{cost}</span>
    </div>
  </div>
);

export const BottomControls: React.FC<BottomControlsProps> = ({ onShuffle, onUndo, onAddBottle, onReveal }) => {
  return (
    <div className="w-full px-4 pb-6 pt-2 flex justify-between items-center max-w-lg mx-auto">
      <ControlButton 
        onClick={onShuffle} 
        icon={<Shuffle size={28} strokeWidth={2.5} />} 
        colorClass="bg-blue-500" 
        cost={COST_SHUFFLE} 
        label="Shuffle"
      />
      <ControlButton 
        onClick={onUndo} 
        icon={<RotateCcw size={28} strokeWidth={2.5} />} 
        colorClass="bg-orange-500" 
        cost={COST_UNDO} 
        label="Undo"
      />
      <ControlButton 
        onClick={onAddBottle} 
        icon={<Plus size={32} strokeWidth={3} />} 
        colorClass="bg-green-500" 
        cost={COST_ADD_BOTTLE} 
        label="Add"
      />
      <ControlButton 
        onClick={onReveal} 
        icon={<Eye size={28} strokeWidth={2.5} />} 
        colorClass="bg-purple-500" 
        cost={COST_REVEAL} 
        label="Reveal"
      />
    </div>
  );
};