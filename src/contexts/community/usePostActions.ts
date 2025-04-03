
import { useState } from 'react';
import { getCommunityPosts, Post } from '@/lib/community';

export function usePostActions() {
  const [posts, setPosts] = useState<Post[]>([]);
  
  // Function to refresh data after post creation
  const handlePostCreated = async () => {
    try {
      const fetchedPosts = await getCommunityPosts();
      setPosts(fetchedPosts);
      return; // Return void instead of posts to match the type in CommunityContextType
    } catch (error) {
      console.error('Error refreshing posts data:', error);
    }
  };
  
  // Function to handle post likes
  const handlePostLiked = async (postId: string) => {
    try {
      const updatedPosts = await getCommunityPosts();
      setPosts(updatedPosts);
    } catch (error) {
      console.error('Error updating posts after like:', error);
    }
  };

  return {
    posts,
    setPosts,
    handlePostCreated,
    handlePostLiked
  };
}
