
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/auth';

import { 
  getUserCourseProgress
} from '@/lib/community';

import { CommunityContextType } from './types';
import { useReputationActions } from './useReputationActions';
import { useBadgeActions } from './useBadgeActions';
import { usePostActions } from './usePostActions';
import { useCourseActions } from './useCourseActions';

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Use our custom hooks
  const { 
    userPoints, userLevel, checkAndAwardDailyLogin, updateReputationData 
  } = useReputationActions(user?.id);
  
  const { 
    userBadges, allBadges, loadBadgeData 
  } = useBadgeActions(user?.id);
  
  const { 
    posts, setPosts, handlePostCreated, handlePostLiked 
  } = usePostActions();
  
  // Function to refresh all data
  const refreshData = async () => {
    setLoading(true);
    try {
      // Load posts
      const fetchedPosts = await handlePostCreated();
      setPosts(fetchedPosts);
      
      if (isAuthenticated && user) {
        // Check and award daily login points
        await checkAndAwardDailyLogin();
        
        // Load user reputation
        await updateReputationData();
        
        // Load badges
        await loadBadgeData();

        // Load course progress
        const progress = await getUserCourseProgress(user.id);
        setCourseProgress(progress);
      }
    } catch (error) {
      console.error('Error loading community data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const { 
    courseProgress, setCourseProgress, recordLessonWatched, 
    completeModule, completeCourse 
  } = useCourseActions(user?.id, refreshData);
  
  // Load initial data
  useEffect(() => {
    refreshData();
  }, [user, isAuthenticated]);
  
  const value: CommunityContextType = {
    userPoints,
    userLevel,
    userBadges,
    allBadges,
    posts,
    loading,
    courseProgress,
    refreshData,
    handlePostCreated,
    handlePostLiked,
    checkAndAwardDailyLogin,
    recordLessonWatched,
    completeModule,
    completeCourse
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
