import React from 'react';
import { DailyMission } from '../types';
import { Check, Gift, X, Star } from 'lucide-react';
import { sounds } from '../utils/sound';
import { useLocale } from '../context/LocaleContext';
import { t } from '../utils/i18n';

interface DailyMissionsProps {
  isOpen: boolean;
  onClose: () => void;
  missions: DailyMission[];
  onClaim: (missionId: string) => void;
}

export const DailyMissions: React.FC<DailyMissionsProps> = ({ isOpen, onClose, missions, onClaim }) => {
  const { locale } = useLocale();
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 px-4">
      <div className="w-full max-w-sm bg-[#2d2d44] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 flex justify-between items-center shadow-lg z-10">
           <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                 <Gift className="text-yellow-300 w-6 h-6 animate-bounce-short" />
              </div>
              <div>
                  <h2 className="text-xl font-black text-white tracking-wide">{t('mission.daily_title', locale)}</h2>
                  <p className="text-blue-100 text-xs font-mono">DAILY MISSIONS</p>
              </div>
           </div>
           <button 
             onClick={onClose}
             className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors"
           >
             <X size={18} />
           </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {missions.map(mission => {
                const isCompleted = mission.progress >= mission.target;
                const percent = Math.min(100, (mission.progress / mission.target) * 100);

                return (
                    <div 
                        key={mission.id} 
                        className={`
                            relative p-4 rounded-2xl border transition-all
                            ${mission.isClaimed 
                                ? 'bg-black/20 border-white/5 opacity-60' 
                                : 'bg-white/5 border-white/10 hover:bg-white/10'}
                        `}
                    >
                        <div className="flex justify-between items-start mb-2">
                             <div>
                                 <div className="font-bold text-white mb-0.5">{t(mission.descriptionKey, locale)}</div>
                                 <div className="text-xs text-white/50 font-mono">
                                     {t('mission.progress', locale)}: <span className={isCompleted ? "text-green-400" : "text-white"}>{mission.progress}</span> / {mission.target}
                                 </div>
                             </div>
                             
                             {/* Reward Badge */}
                             <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded-lg border border-white/5">
                                 <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_5px_rgba(250,204,21,0.8)]"></div>
                                 <span className="text-yellow-100 font-bold text-sm">+{mission.reward}</span>
                             </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mb-3">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>

                        {/* Action Button */}
                        {mission.isClaimed ? (
                             <div className="w-full py-2 flex items-center justify-center gap-2 text-white/30 font-bold text-sm bg-black/20 rounded-xl">
                                 <Check size={16} /> {t('mission.claimed', locale)}
                             </div>
                        ) : isCompleted ? (
                             <button 
                                onClick={() => {
                                    sounds.win(); // Re-use win sound for claiming
                                    onClaim(mission.id);
                                }}
                                className="w-full py-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl font-bold text-white shadow-lg shadow-orange-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 animate-pulse"
                             >
                                <Star size={16} fill="white" /> {t('mission.claim_reward', locale)}
                             </button>
                        ) : (
                             <div className="w-full py-2 text-center text-white/30 font-bold text-sm border border-white/5 rounded-xl">
                                 {t('mission.in_progress', locale)}
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
