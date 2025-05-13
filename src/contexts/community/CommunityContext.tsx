
import React, { createContext, useContext } from 'react';
import { PostsProvider, usePosts } from './usePostsContext';
import { BadgesProvider, useBadges } from './useBadgesContext';
import { CourseProgressProvider, useCourseProgress } from './useCourseProgressContext';
import { ReputationProvider, useReputation } from './useReputationContext';
import { initCommunityStorage } from '@/lib/community/storage-service';
import { useEffect, useState } from 'react';
import { CommunityContextType } from './types';

// Create a combined context to maintain backward compatibility
const CommunityContext = createContext<CommunityContextType>({} as CommunityContextType);

export const CommunityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storageInitialized, setStorageInitialized] = useState(false);

  // Initialize storage on mount
  useEffect(() => {
    const initStorage = async () => {
      try {
        // Only initialize storage if we're on a community or courses page
        if (window.location.pathname.includes('/community') || 
            window.location.pathname.includes('/courses')) {
          await initCommunityStorage();
          setStorageInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing community storage:', error);
        // Don't block other initialization if storage fails
      }
    };
    
    initStorage();
  }, []);

  return (
    <PostsProvider>
      <BadgesProvider>
        <ReputationProvider>
          <CourseProgressProvider>
            <CombinedContextProvider>
              {children}
            </CombinedContextProvider>
          </CourseProgressProvider>
        </ReputationProvider>
      </BadgesProvider>
    </PostsProvider>
  );
};

// This provider combines all the specialized contexts to provide a single interface
// that maintains backward compatibility with the original CommunityContext
const CombinedContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const postsContext = usePosts();
  const badgesContext = useBadges();
  const courseProgressContext = useCourseProgress();
  const reputationContext = useReputation();
  
  // Combine all contexts into a single value object
  const value: CommunityContextType = {
    // Posts related fields
    posts: postsContext.posts,
    tags: postsContext.tags,
    loading: postsContext.loading,
    activePostId: postsContext.activePostId,
    activePost: postsContext.activePost,
    activePostComments: postsContext.activePostComments,
    addNewPost: postsContext.addNewPost,
    handlePostLiked: postsContext.handlePostLiked,
    setActivePostId: postsContext.setActivePostId,
    addNewComment: postsContext.addNewComment,
    handleCommentAdded: postsContext.handleCommentAdded,
    createPost: postsContext.createPost,
    
    // Badges related fields
    badges: badgesContext.userBadges,
    allBadges: badgesContext.allBadges,
    userBadges: badgesContext.userBadges,
    
    // Course progress related fields
    courseProgress: courseProgressContext.courseProgress,
    recordLessonWatched: courseProgressContext.recordLessonWatched,
    completeModule: courseProgressContext.completeModule,
    completeCourse: courseProgressContext.completeCourse,
    
    // Reputation related fields
    reputationPoints: reputationContext.userPoints,
    userPoints: reputationContext.userPoints,
    userLevel: reputationContext.userLevel,
    userStreak: reputationContext.userStreak,
    
    // Combined refresh methods
    refreshData: {
      fetchPosts: postsContext.refreshData.fetchPosts,
      fetchTags: postsContext.refreshData.fetchTags,
      fetchUserBadges: badgesContext.refreshData.fetchUserBadges,
      fetchUserReputation: reputationContext.refreshData.fetchUserReputation,
      fetchUserCourseProgress: courseProgressContext.refreshData.fetchUserCourseProgress
    }
  };
  
  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  );
};

// Export the hook with same name to maintain backward compatibility
export const useCommunity = () => {
  const context = useContext(CommunityContext);
  
  if (context === undefined) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  
  return context;
};
