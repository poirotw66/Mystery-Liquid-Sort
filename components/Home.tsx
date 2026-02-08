import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Bottle } from './Bottle';
import { BottleData, Color } from '../types';
import { createLayer } from '../services/gameLogic';

export const Home: React.FC = () => {
  const navigate = useNavigate();

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

  return (
    <div className="relative w-full h-screen bg-[#1a1a2e] flex flex-col items-center justify-center text-white overflow-hidden font-sans">
        
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2a1b3d] to-[#0f0f1a] z-0"></div>
        <div className="absolute top-0 left-0 right-0 h-[60%] bg-[radial-gradient(circle_at_50%_0%,rgba(100,50,255,0.2),transparent_70%)] pointer-events-none z-0"></div>

        <div className="z-10 flex flex-col items-center space-y-12">
            
            {/* Title Section */}
            <div className="text-center space-y-2 animate-fade-in-down">
                <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] tracking-tight">
                    MYSTERY
                </h1>
                <h2 className="text-3xl md:text-5xl font-black text-white/90 tracking-wide drop-shadow-md">
                    LIQUID SORT
                </h2>
                <p className="text-white/60 font-mono tracking-widest text-sm mt-4">PUZZLE & COLLECTION</p>
            </div>

            {/* Visual Showcase */}
            <div className="flex items-end justify-center gap-6 md:gap-12 py-8 animate-float">
                {/* Left Bottle */}
                <div className="transform scale-90 -rotate-6 opacity-80 blur-[1px]">
                     <Bottle 
                        bottle={decorativeBottles[0]} 
                        isSelected={false} 
                        onClick={() => {}} 
                    />
                </div>
                
                {/* Center Bottle */}
                <div className="transform scale-110 z-10 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                    <Bottle 
                        bottle={decorativeBottles[1]} 
                        isSelected={false} 
                        onClick={() => {}} 
                    />
                </div>

                {/* Right Bottle */}
                <div className="transform scale-90 rotate-6 opacity-80 blur-[1px]">
                    <Bottle 
                        bottle={decorativeBottles[2]} 
                        isSelected={false} 
                        onClick={() => {}} 
                    />
                </div>
            </div>

            {/* Action Button */}
            <button 
                onClick={() => navigate('/game')}
                className="group relative px-8 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center gap-4 shadow-[0_10px_40px_rgba(16,185,129,0.4)] hover:shadow-[0_10px_60px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 transition-all duration-300"
            >
                <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm border border-white/30 group-hover:bg-white/30 transition-colors">
                    <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                </div>
                <span className="text-2xl font-bold tracking-wide text-white pr-2">PLAY NOW</span>
                
                {/* Button Shine Effect */}
                <div className="absolute inset-0 rounded-full overflow-hidden">
                    <div className="absolute top-0 left-0 w-2/3 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:animate-shine"></div>
                </div>
            </button>

            {/* Footer */}
            <div className="absolute bottom-8 text-white/20 text-xs">
                v1.0.0 • React Liquid Engine
            </div>
        </div>
    </div>
  );
};
