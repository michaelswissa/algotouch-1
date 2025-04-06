
import { supabase } from '@/integrations/supabase/client';
import { Post, Tag } from './types';
import { awardPoints, ACTIVITY_TYPES } from './reputation-service';
import { toast } from 'sonner';
import { getTagsForPost } from './tags-service';

/**
 * Register a post in the community
 */
export async function registerCommunityPost(
  userId: string,
  title: string,
  content: string,
  mediaUrls: string[] = [],
  tagIds: string[] = []
): Promise<string | null> {
  try {
    if (!userId || !title || !content) {
      toast.error('Missing required information for post');
      return null;
    }
    
    // Insert the post
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: userId,
        title,
        content,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating post:', error);
      toast.error('שגיאה ביצירת הפוסט');
      return null;
    }
    
    // Add tags if provided
    const postId = data.id;
    if (tagIds.length > 0) {
      const tagsData = tagIds.map(tagId => ({
        post_id: postId,
        tag_id: tagId
      }));
      
      const { error: tagError } = await supabase
        .from('post_tags')
        .insert(tagsData);
      
      if (tagError) {
        console.error('Error adding tags to post:', tagError);
        // Don't return null here, since the post was created successfully
      }
    }
    
    // Award points for creating a post
    const success = await awardPoints(userId, ACTIVITY_TYPES.NEW_POST, postId);
    
    if (success) {
      toast.success('קיבלת 10 נקודות עבור פרסום פוסט חדש!', {
        duration: 3000,
      });
    }
    
    return postId;
  } catch (error) {
    console.error('Exception in registerCommunityPost:', error);
    toast.error('שגיאה בלתי צפויה בעת יצירת הפוסט');
    return null;
  }
}

/**
 * Like a post and award points to the post author
 */
export async function likePost(
  postId: string, 
  userId: string
): Promise<boolean> {
  try {
    // First get the post to identify the author
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('user_id, likes')
      .eq('id', postId)
      .single();
    
    if (postError) {
      console.error('Error fetching post:', postError);
      return false;
    }
    
    // Update the post likes count
    const { error: updateError } = await supabase
      .from('community_posts')
      .update({ likes: post.likes + 1 })
      .eq('id', postId);
    
    if (updateError) {
      console.error('Error updating likes:', updateError);
      return false;
    }
    
    // Award points to the post author (not to the person who liked)
    if (post.user_id && post.user_id !== userId) {
      await awardPoints(post.user_id, ACTIVITY_TYPES.POST_LIKED, postId);
    }
    
    return true;
  } catch (error) {
    console.error('Exception in likePost:', error);
    return false;
  }
}

/**
 * Get posts for the community page with tags
 */
export async function getCommunityPosts(): Promise<Post[]> {
  try {
    // First fetch posts without profiles
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching posts:', error);
      return [];
    }

    // If no posts, return empty array
    if (!data || data.length === 0) {
      return [];
    }
    
    // Now fetch profiles for all user IDs
    const userIds = [...new Set(data.map(post => post.user_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }
    
    // Get tags for posts
    const enhancedPosts = await Promise.all(data.map(async post => {
      const profile = profiles?.find(p => p.id === post.user_id);
      const tags = await getTagsForPost(post.id);
      
      return {
        ...post,
        profiles: profile ? {
          first_name: profile.first_name,
          last_name: profile.last_name
        } : undefined,
        tags: tags
      } as Post;
    }));
    
    return enhancedPosts;
  } catch (error) {
    console.error('Exception in getCommunityPosts:', error);
    return [];
  }
}

/**
 * Get a specific post by ID
 */
export async function getPostById(postId: string): Promise<Post | null> {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('id', postId)
      .single();
    
    if (error) {
      console.error('Error fetching post:', error);
      return null;
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', data.user_id)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }
    
    // Get tags
    const tags = await getTagsForPost(postId);
    
    return {
      ...data,
      profiles: profile || undefined,
      tags: tags
    } as Post;
  } catch (error) {
    console.error('Exception in getPostById:', error);
    return null;
  }
}

/**
 * Upload media for posts
 */
export async function uploadPostMedia(
  userId: string,
  file: File
): Promise<string | null> {
  try {
    const filePath = `${userId}/posts/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('community_media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading file:', error);
      toast.error('שגיאה בהעלאת קובץ');
      return null;
    }
    
    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('community_media')
      .getPublicUrl(data.path);
    
    return publicUrl;
  } catch (error) {
    console.error('Exception in uploadPostMedia:', error);
    toast.error('שגיאה בלתי צפויה בהעלאת קובץ');
    return null;
  }
}
