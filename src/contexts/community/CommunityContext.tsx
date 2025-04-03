
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

import { 
  getUserReputation, 
  getUserBadges, 
  getAllBadges, 
  getCommunityPosts,
  awardPoints,
  ACTIVITY_TYPES,
  Badge,
  UserBadge,
  Post,
  ReputationData
} from '@/lib/community';
import { supabase } from '@/integrations/supabase/client';

interface CommunityContextType {
  // Reputation data
  userPoints: number;
  userLevel: number;
  
  // Badge data
  userBadges: UserBadge[];
  allBadges: Badge[];
  
  // Posts data
  posts: Post[];
  loading: boolean;

  // Actions
  refreshData: () => Promise<void>;
  handlePostCreated: () => Promise<void>;
  handlePostLiked: (postId: string) => Promise<void>;
  checkAndAwardDailyLogin: () => Promise<void>;
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  
  // State
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  
  // Load initial data
  useEffect(() => {
    loadData();
  }, [user, isAuthenticated]);
  
  // Function to load all data
  const loadData = async () => {
    setLoading(true);
    try {
      // Load posts
      const fetchedPosts = await getCommunityPosts();
      setPosts(fetchedPosts);
      
      if (isAuthenticated && user) {
        // Check and award daily login points
        await checkAndAwardDailyLogin();
        
        // Load user reputation
        const reputation = await getUserReputation(user.id);
        if (reputation) {
          setUserPoints(reputation.points);
          setUserLevel(reputation.level);
        }
        
        // Load user badges
        const badges = await getUserBadges(user.id);
        setUserBadges(badges);
        
        // Load all badges
        const availableBadges = await getAllBadges();
        setAllBadges(availableBadges);
      }
    } catch (error) {
      console.error('Error loading community data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to check and award daily login points
  const checkAndAwardDailyLogin = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Check if user already got points today
      const { data } = await supabase
        .from('community_activities')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('activity_type', ACTIVITY_TYPES.DAILY_LOGIN)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .maybeSingle();
      
      if (!data) {
        // Award points for daily login
        const success = await awardPoints(user.id, ACTIVITY_TYPES.DAILY_LOGIN);
        if (success) {
          toast.success('קיבלת 2 נקודות על כניסה יומית!', {
            duration: 3000,
          });
          
          // Update user points after awarding
          const reputation = await getUserReputation(user.id);
          if (reputation) {
            setUserPoints(reputation.points);
            setUserLevel(reputation.level);
          }
        }
      }
    } catch (error) {
      console.error('Error checking daily login:', error);
    }
  };
  
  // Function to refresh data completely
  const refreshData = async () => {
    await loadData();
  };
  
  // Function to refresh data after post creation
  const handlePostCreated = async () => {
    setLoading(true);
    try {
      const fetchedPosts = await getCommunityPosts();
      setPosts(fetchedPosts);
      
      if (isAuthenticated && user) {
        const reputation = await getUserReputation(user.id);
        if (reputation) {
          setUserPoints(reputation.points);
          setUserLevel(reputation.level);
        }
        
        const badges = await getUserBadges(user.id);
        setUserBadges(badges);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle post likes
  const handlePostLiked = async (postId: string) => {
    const updatedPosts = await getCommunityPosts();
    setPosts(updatedPosts);
  };
  
  const value = {
    userPoints,
    userLevel,
    userBadges,
    allBadges,
    posts,
    loading,
    refreshData,
    handlePostCreated,
    handlePostLiked,
    checkAndAwardDailyLogin
  };
  
  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  );
}

export const useCommunity = () => {
  const context = useContext(CommunityContext);
  if (context === undefined) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return context;
};
