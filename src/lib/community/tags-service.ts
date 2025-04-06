
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
    const { data, error } = await supabase
      .from('post_tags')
      .select('tag:tag_id(id, name)')
      .eq('post_id', postId);
    
    if (error) {
      console.error('Error fetching post tags:', error);
      return [];
    }
    
    // Extract the actual tag objects from the response
    return data.map(item => item.tag as Tag);
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
