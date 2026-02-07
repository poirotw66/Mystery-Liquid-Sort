import React from 'react';
import { Order } from '../types';
import { CheckCircle2, Lock } from 'lucide-react';

interface TargetAreaProps {
  orders: Order[];
}

export const TargetArea: React.FC<TargetAreaProps> = ({ orders }) => {
  return (
    <div className="w-full flex flex-col items-center mb-6">
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-end px-4 mb-2">
        <span className="text-white/80 text-sm font-bold tracking-wider uppercase drop-shadow-md">Customer Orders</span>
        <span className="text-white/90 font-mono bg-black/30 px-2 py-0.5 rounded text-xs border border-white/10">
          {orders.filter(o => o.isCompleted).length} / {orders.length}
        </span>
      </div>

      {/* Orders Shelf */}
      <div className="w-full max-w-lg bg-[#2d2d44]/50 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
        <div className="flex justify-center items-center gap-3 min-h-[5rem]">
          {orders.map((order) => {
            return (
              <div key={order.id} className="relative group">
                {/* Order Container */}
                <div 
                  className={`
                    relative w-14 h-20 rounded-lg flex flex-col items-center justify-end overflow-hidden transition-all duration-500
                    ${order.isCompleted 
                      ? 'bg-white shadow-[0_5px_15px_rgba(0,0,0,0.3)] scale-100 opacity-100' 
                      : order.isLocked
                        ? 'bg-white/5 border-2 border-white/10 opacity-60'
                        : 'bg-transparent border-2 border-dashed opacity-80'
                    }
                  `}
                  style={{
                    borderColor: !order.isLocked && !order.isCompleted ? order.color : undefined
                  }}
                >
                  {/* LOCKED STATE */}
                  {order.isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Lock className="w-5 h-5 text-white/40" />
                    </div>
                  )}

                  {/* UNLOCKED & INCOMPLETE: Requested Color Indicator */}
                  {!order.isCompleted && !order.isLocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50 animate-pulse">
                        <div className="w-6 h-6 rounded-full mb-1 shadow-sm" style={{ backgroundColor: order.color }}></div>
                        <span className="text-[10px] text-white font-bold uppercase tracking-wider">Need</span>
                    </div>
                  )}

                  {/* COMPLETED STATE: Bottle Icon */}
                  {order.isCompleted && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 z-10 animate-fade-in-up">
                      <div 
                        className="w-6 h-10 rounded-sm mb-1 shadow-sm"
                        style={{ backgroundColor: order.color }}
                      ></div>
                      {/* Cap */}
                      <div className="w-8 h-2 bg-gray-800 rounded-sm absolute top-4 shadow-md"></div>
                    </div>
                  )}

                  {/* Handle (Visual for Bag Look) */}
                  <div className={`absolute -top-3 w-8 h-6 rounded-full border-[3px] z-0 transition-colors
                      ${order.isCompleted ? 'border-gray-300' : 'opacity-10'}`} 
                      style={{ borderColor: !order.isLocked && !order.isCompleted ? order.color : undefined }}
                  />
                </div>

                {/* Checkmark Overlay */}
                {order.isCompleted && (
                  <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full text-white shadow-md z-20 animate-bounce-short">
                    <CheckCircle2 size={16} fill="white" className="text-green-600" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};