
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/auth';

import { 
  getUserCourseProgress,
  getPostById,
  getPostComments,
  addComment,
  uploadPostMedia
} from '@/lib/community';

import { CommunityContextType } from './types';
import { useReputationActions } from './useReputationActions';
import { useBadgeActions } from './useBadgeActions';
import { usePostActions } from './usePostActions';
import { useCourseActions } from './useCourseActions';
import { useStreakActions } from './useStreakActions';
import { getAllTags } from '@/lib/community/tags-service';
import { Post, Comment, Tag } from '@/lib/community/types';

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [activePostComments, setActivePostComments] = useState<Comment[]>([]);
  
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

  const {
    userStreak, getUserStreak, updateUserStreak
  } = useStreakActions(user?.id);
  
  // Function to refresh all data
  const refreshData = async () => {
    setLoading(true);
    try {
      // Load posts
      await handlePostCreated();
      
      // Load tags
      const fetchedTags = await getAllTags();
      setTags(fetchedTags);
      
      if (isAuthenticated && user) {
        // Check and award daily login points
        await checkAndAwardDailyLogin();
        
        // Update user streak
        await updateUserStreak();
        
        // Load user reputation
        await updateReputationData();
        
        // Load badges
        await loadBadgeData();

        // Load course progress
        const progress = await getUserCourseProgress(user.id);
        setCourseProgress(progress);
      }
      
      // Refresh active post data if applicable
      if (activePostId) {
        await loadActivePostData(activePostId);
      }
    } catch (error) {
      console.error('Error loading community data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle setting active post and loading its data
  const handleSetActivePostId = async (postId: string | null) => {
    setActivePostId(postId);
    if (postId) {
      await loadActivePostData(postId);
    } else {
      setActivePost(null);
      setActivePostComments([]);
    }
  };
  
  // Load post and comments by ID
  const loadActivePostData = async (postId: string) => {
    try {
      setLoading(true);
      
      // Load the post
      const post = await getPostById(postId);
      setActivePost(post);
      
      // Load comments for this post
      const comments = await getPostComments(postId);
      setActivePostComments(comments);
    } catch (error) {
      console.error('Error loading post data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to add a new comment to a post
  const addNewComment = async (
    postId: string, 
    content: string, 
    parentId?: string
  ) => {
    if (!isAuthenticated || !user) return null;
    
    const commentId = await addComment(postId, user.id, content, parentId);
    return commentId;
  };
  
  // Function to handle when a comment is added
  const handleCommentAdded = async (postId: string) => {
    // Refresh post list to update comment counts
    await handlePostCreated();
    
    // If we're viewing this post, refresh its comments
    if (activePostId === postId) {
      await loadActivePostData(postId);
    }
  };
  
  // Function to upload media for posts
  const uploadMedia = async (file: File) => {
    if (!isAuthenticated || !user) return null;
    
    return await uploadPostMedia(user.id, file);
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
    tags,
    courseProgress,
    userStreak,
    activePostId,
    activePost,
    activePostComments,
    refreshData,
    handlePostCreated,
    handlePostLiked,
    checkAndAwardDailyLogin,
    recordLessonWatched,
    completeModule,
    completeCourse,
    setActivePostId: handleSetActivePostId,
    handleCommentAdded,
    addNewComment,
    uploadMedia
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
