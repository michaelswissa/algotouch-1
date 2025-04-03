
import { useState } from 'react';
import { getUserBadges, getAllBadges, Badge, UserBadge } from '@/lib/community';

export function useBadgeActions(userId: string | undefined) {
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);

  const loadBadgeData = async () => {
    if (!userId) return;
    
    try {
      // Load user badges
      const badges = await getUserBadges(userId);
      setUserBadges(badges);
      
      // Load all badges
      const availableBadges = await getAllBadges();
      setAllBadges(availableBadges);
    } catch (error) {
      console.error('Error loading badge data:', error);
    }
  };

  return {
    userBadges,
    allBadges,
    setUserBadges,
    setAllBadges,
    loadBadgeData
  };
}
