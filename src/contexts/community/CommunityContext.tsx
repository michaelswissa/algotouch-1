
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../auth';
import { CommunityContextType } from './types';
import {
  getCommunityPosts, registerCommunityPost, getPostById, likePost, uploadPostMedia,
  getPostComments, addComment, getAllTags, createTag, addTagsToPost,
  getUserBadges, getAllBadges, getUserReputation, getUserReputationPoints,
  initCommunityStorage
} from '@/lib/community';
import { Comment, Post, Tag, UserBadge, UserStreak, Badge } from '@/lib/community/types';
import { toast } from 'sonner';

// Create context with default empty values
const CommunityContext = createContext<CommunityContextType>({} as CommunityContextType);

export const CommunityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [reputationPoints, setReputationPoints] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [userStreak, setUserStreak] = useState<UserStreak | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [activePostComments, setActivePostComments] = useState<Comment[]>([]);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initCommunityStorage();
        await fetchTags();
        await fetchPosts();
        await fetchAllBadges();
      } catch (error) {
        console.error('Error initializing community:', error);
      }
    };
    
    init();
  }, []);
  
  // Fetch current user's data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserBadges(user.id);
      fetchUserReputation(user.id);
    }
  }, [isAuthenticated, user]);
  
  // Fetch post details when activePostId changes
  useEffect(() => {
    if (activePostId) {
      fetchActivePost(activePostId);
      fetchComments(activePostId);
    } else {
      setActivePost(null);
      setActivePostComments([]);
    }
  }, [activePostId]);
  
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const fetchedPosts = await getCommunityPosts();
      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('שגיאה בטעינת הפוסטים');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTags = async () => {
    try {
      const fetchedTags = await getAllTags();
      setTags(fetchedTags);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };
  
  const fetchAllBadges = async () => {
    try {
      const badges = await getAllBadges();
      setAllBadges(badges);
    } catch (error) {
      console.error('Error fetching all badges:', error);
    }
  };
  
  const fetchUserBadges = async (userId: string) => {
    try {
      const fetchedBadges = await getUserBadges(userId);
      setBadges(fetchedBadges);
    } catch (error) {
      console.error('Error fetching user badges:', error);
    }
  };
  
  const fetchUserReputation = async (userId: string) => {
    try {
      const reputation = await getUserReputation(userId);
      if (reputation) {
        setReputationPoints(reputation.points);
        setUserLevel(reputation.level);
      }
    } catch (error) {
      console.error('Error fetching user reputation:', error);
    }
  };
  
  const fetchActivePost = async (postId: string) => {
    try {
      const post = await getPostById(postId);
      setActivePost(post);
    } catch (error) {
      console.error('Error fetching post details:', error);
    }
  };
  
  const fetchComments = async (postId: string) => {
    try {
      const comments = await getPostComments(postId);
      setActivePostComments(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };
  
  const addNewPost = async (
    title: string, 
    content: string, 
    mediaUrls: string[] = [],
    tagIds: string[] = [],
    newTags: string[] = []
  ) => {
    if (!isAuthenticated || !user) {
      toast.error('יש להתחבר כדי לפרסם');
      return false;
    }
    
    try {
      // Create new tags if needed
      const createdTagIds: string[] = [];
      
      for (const tagName of newTags) {
        const tagId = await createTag(tagName);
        if (tagId) {
          createdTagIds.push(tagId);
          
          // Update the local tags state
          setTags(prevTags => [
            ...prevTags,
            { id: tagId, name: tagName }
          ]);
        }
      }
      
      // Combine existing and newly created tag IDs
      const allTagIds = [...tagIds, ...createdTagIds];
      
      // Create the post
      const postId = await registerCommunityPost(
        user.id,
        title,
        content,
        mediaUrls,
        allTagIds
      );
      
      if (postId) {
        // Refresh the posts list
        await fetchPosts();
        
        // If the user had points awarded, refresh their reputation
        await fetchUserReputation(user.id);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('שגיאה בפרסום הפוסט');
      return false;
    }
  };
  
  const handlePostLiked = async (postId: string) => {
    // Refresh the posts to show updated like count
    await fetchPosts();
    
    // If viewing single post, refresh it too
    if (activePostId === postId && activePost) {
      await fetchActivePost(postId);
    }
  };
  
  const addNewComment = async (
    postId: string, 
    content: string,
    parentCommentId?: string
  ) => {
    if (!isAuthenticated || !user) {
      toast.error('יש להתחבר כדי להגיב');
      return null;
    }
    
    try {
      const commentId = await addComment(
        postId,
        user.id,
        content,
        parentCommentId
      );
      
      return commentId;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('שגיאה בהוספת תגובה');
      return null;
    }
  };
  
  const handleCommentAdded = async (postId: string) => {
    // Refresh comments
    await fetchComments(postId);
    
    // Refresh posts to show updated comment count
    await fetchPosts();
    
    // If viewing single post, refresh it too
    if (activePostId === postId && activePost) {
      await fetchActivePost(postId);
    }
  };
  
  // Helper object for post creation operations
  const createPost = {
    uploadMedia: async (file: File): Promise<string | null> => {
      if (!isAuthenticated || !user) {
        toast.error('יש להתחבר כדי להעלות תמונות');
        return null;
      }
      
      return await uploadPostMedia(user.id, file);
    }
  };
  
  // Provide context value
  const value: CommunityContextType = {
    posts,
    tags,
    badges,
    reputationPoints,
    loading,
    activePostId,
    activePost,
    activePostComments,
    userLevel,
    userPoints: reputationPoints,
    userBadges: badges,
    userStreak,
    allBadges,
    addNewPost,
    handlePostLiked,
    setActivePostId,
    addNewComment,
    handleCommentAdded,
    createPost,
    refreshData: {
      fetchPosts,
      fetchTags,
      fetchUserBadges: () => user && fetchUserBadges(user.id),
      fetchUserReputation: () => user && fetchUserReputation(user.id)
    }
  };
  
  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = () => useContext(CommunityContext);
