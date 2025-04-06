
import { supabase } from '@/integrations/supabase/client';
import { Comment } from './types';
import { awardPoints, ACTIVITY_TYPES } from './reputation-service';
import { toast } from 'sonner';

/**
 * Get comments for a specific post
 */
export async function getPostComments(postId: string): Promise<Comment[]> {
  try {
    // First fetch comments without profiles or replies
    const { data: comments, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .is('parent_comment_id', null) // Only top-level comments
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }

    // If no comments, return empty array
    if (!comments || comments.length === 0) {
      return [];
    }
    
    // Get profile info for comments
    const userIds = [...new Set(comments.map(comment => comment.user_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);
    
    if (profilesError) {
      console.error('Error fetching profiles for comments:', profilesError);
    }
    
    // Get replies
    const { data: replies, error: repliesError } = await supabase
      .from('community_comments')
      .select('*, profiles:profiles(id, first_name, last_name)')
      .eq('post_id', postId)
      .not.is('parent_comment_id', null);
    
    if (repliesError) {
      console.error('Error fetching replies:', repliesError);
    }
    
    // Format and combine data
    const formattedComments = comments.map(comment => {
      const profile = profiles?.find(p => p.id === comment.user_id);
      const commentReplies = replies?.filter(reply => reply.parent_comment_id === comment.id) || [];
      
      return {
        ...comment,
        profiles: profile ? {
          first_name: profile.first_name,
          last_name: profile.last_name
        } : undefined,
        replies: commentReplies.map(reply => ({
          ...reply,
          profiles: reply.profiles
        }))
      } as Comment;
    });
    
    return formattedComments;
  } catch (error) {
    console.error('Exception in getPostComments:', error);
    return [];
  }
}

/**
 * Add a new comment to a post
 */
export async function addComment(
  postId: string, 
  userId: string, 
  content: string,
  parentCommentId?: string
): Promise<string | null> {
  try {
    if (!postId || !userId || !content.trim()) {
      toast.error('חסר מידע הנדרש להוספת תגובה');
      return null;
    }
    
    // Insert comment
    const { data, error } = await supabase
      .from('community_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: content.trim(),
        parent_comment_id: parentCommentId || null
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error adding comment:', error);
      toast.error('שגיאה בהוספת תגובה');
      return null;
    }
    
    // Update post comment count
    await supabase
      .from('community_posts')
      .update({ comments: supabase.rpc('increment', { row_id: postId, table: 'community_posts', column_name: 'comments' }) })
      .eq('id', postId);
    
    // Award points for adding a comment
    const commentId = data.id;
    await awardPoints(userId, ACTIVITY_TYPES.COMMENT_ADDED, commentId);
    
    toast.success('התגובה נוספה בהצלחה!');
    return commentId;
  } catch (error) {
    console.error('Exception in addComment:', error);
    toast.error('שגיאה בלתי צפויה בעת הוספת תגובה');
    return null;
  }
}

/**
 * Like a comment
 */
export async function likeComment(
  commentId: string, 
  userId: string
): Promise<boolean> {
  try {
    // Update the comment likes count
    const { error } = await supabase
      .from('community_comments')
      .update({ 
        likes: supabase.rpc('increment', { row_id: commentId, table: 'community_comments', column_name: 'likes' }) 
      })
      .eq('id', commentId);
    
    if (error) {
      console.error('Error liking comment:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception in likeComment:', error);
    return false;
  }
}
