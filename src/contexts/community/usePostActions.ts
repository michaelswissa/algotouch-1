
import { useState } from 'react';
import { getCommunityPosts, Post } from '@/lib/community';

export function usePostActions() {
  const [posts, setPosts] = useState<Post[]>([]);
  
  // Function to refresh data after post creation
  const handlePostCreated = async () => {
    try {
      const fetchedPosts = await getCommunityPosts();
      setPosts(fetchedPosts);
      return fetchedPosts;
    } catch (error) {
      console.error('Error refreshing posts data:', error);
      return [];
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
