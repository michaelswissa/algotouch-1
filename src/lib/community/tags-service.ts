
import { supabase } from '@/integrations/supabase/client';
import { Tag } from './types';
import { toast } from 'sonner';

/**
 * Get all available tags
 */
export async function getAllTags(): Promise<Tag[]> {
  try {
    const { data, error } = await supabase
      .from('community_tags')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching tags:', error);
      return [];
    }
    
    return data as Tag[];
  } catch (error) {
    console.error('Exception in getAllTags:', error);
    return [];
  }
}

/**
 * Get tags for a specific post
 */
export async function getTagsForPost(postId: string): Promise<Tag[]> {
  try {
    // First get the tag IDs for the post
    const { data: postTags, error: postTagsError } = await supabase
      .from('post_tags')
      .select('tag_id')
      .eq('post_id', postId);
    
    if (postTagsError || !postTags || postTags.length === 0) {
      if (postTagsError) console.error('Error fetching post tags:', postTagsError);
      return [];
    }
    
    // Get the tag details
    const tagIds = postTags.map(item => item.tag_id);
    
    const { data: tags, error: tagsError } = await supabase
      .from('community_tags')
      .select('*')
      .in('id', tagIds);
    
    if (tagsError) {
      console.error('Error fetching tags:', tagsError);
      return [];
    }
    
    return tags as Tag[];
  } catch (error) {
    console.error('Exception in getTagsForPost:', error);
    return [];
  }
}

/**
 * Add a tag to the system
 */
export async function createTag(name: string): Promise<string | null> {
  try {
    if (!name.trim()) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('community_tags')
      .insert({ name: name.trim() })
      .select('id')
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique violation
        toast.error('תגית זו כבר קיימת');
      } else {
        console.error('Error creating tag:', error);
        toast.error('שגיאה ביצירת תגית');
      }
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error('Exception in createTag:', error);
    toast.error('שגיאה בלתי צפויה ביצירת תגית');
    return null;
  }
}

/**
 * Add tags to a post
 */
export async function addTagsToPost(postId: string, tagIds: string[]): Promise<boolean> {
  try {
    if (!postId || !tagIds.length) {
      return false;
    }
    
    // Prepare the data for bulk insert
    const tagsData = tagIds.map(tagId => ({
      post_id: postId,
      tag_id: tagId
    }));
    
    const { error } = await supabase
      .from('post_tags')
      .insert(tagsData);
    
    if (error) {
      console.error('Error adding tags to post:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception in addTagsToPost:', error);
    return false;
  }
}
