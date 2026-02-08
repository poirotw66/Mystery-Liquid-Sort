import { DailyMission, MissionType } from '../types';

const STORAGE_KEY_MISSIONS = 'mls_daily_missions';
const STORAGE_KEY_DATE = 'mls_mission_date';

/**
 * Generates a fresh set of daily missions.
 */
const generateMissions = (): DailyMission[] => {
  return [
    {
      id: 'm_pour',
      type: 'POUR',
      description: '傾倒液體',
      target: 30,
      progress: 0,
      reward: 100,
      isClaimed: false,
    },
    {
      id: 'm_win',
      type: 'WIN_LEVEL',
      description: '完成關卡',
      target: 3,
      progress: 0,
      reward: 300,
      isClaimed: false,
    },
    {
      id: 'm_item',
      type: 'USE_ITEM',
      description: '使用任意道具',
      target: 2,
      progress: 0,
      reward: 150,
      isClaimed: false,
    }
  ];
};

/**
 * Loads missions from local storage.
 * Resets them if the date has changed.
 */
export const loadDailyMissions = (): DailyMission[] => {
  const savedDate = localStorage.getItem(STORAGE_KEY_DATE);
  const today = new Date().toDateString();

  // If date changed or no data, generate new
  if (savedDate !== today) {
    const newMissions = generateMissions();
    saveDailyMissions(newMissions);
    localStorage.setItem(STORAGE_KEY_DATE, today);
    return newMissions;
  }

  // Otherwise load existing
  const savedMissions = localStorage.getItem(STORAGE_KEY_MISSIONS);
  return savedMissions ? JSON.parse(savedMissions) : generateMissions();
};

/**
 * Saves missions to local storage.
 */
export const saveDailyMissions = (missions: DailyMission[]) => {
  localStorage.setItem(STORAGE_KEY_MISSIONS, JSON.stringify(missions));
};

/**
 * Helper to update progress for a specific mission type.
 * Returns the new missions array and how many coins were auto-claimed (if any logic requires auto-claim, 
 * though usually we want manual claim). 
 * Here we just return the updated array.
 */
export const updateMissionProgress = (
  missions: DailyMission[], 
  type: MissionType, 
  amount: number = 1
): DailyMission[] => {
  const updated = missions.map(m => {
    if (m.type === type && !m.isClaimed && m.progress < m.target) {
       // Only update if not claimed and not fully maxed (visual cap)
       // Actually, we can cap progress at target visually in UI
       return { ...m, progress: Math.min(m.progress + amount, m.target) };
    }
    return m;
  });
  
  saveDailyMissions(updated);
  return updated;
};

export const hasUnclaimedRewards = (missions: DailyMission[]): boolean => {
  return missions.some(m => m.progress >= m.target && !m.isClaimed);
};
