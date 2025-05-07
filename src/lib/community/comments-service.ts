import { supabase } from '@/integrations/supabase/client';
import { Comment } from './types';
import { awardPoints, ACTIVITY_TYPES } from './reputation-service';
import { toast } from 'sonner';
import { incrementColumnValue } from './utils';

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
      .eq('parent_comment_id', null) // Only top-level comments
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
      .select('*')
      .eq('post_id', postId)
      .not('parent_comment_id', 'is', null);
    
    if (repliesError) {
      console.error('Error fetching replies:', repliesError);
    }
    
    // Get profiles for replies
    const replyUserIds = replies ? [...new Set(replies.map(reply => reply.user_id))] : [];
    const { data: replyProfiles, error: replyProfilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', replyUserIds);
    
    if (replyProfilesError) {
      console.error('Error fetching profiles for replies:', replyProfilesError);
    }
    
    // Format and combine data
    const formattedComments = comments.map(comment => {
      const profile = profiles?.find(p => p.id === comment.user_id);
      const commentReplies = replies?.filter(reply => reply.parent_comment_id === comment.id) || [];
      
      // Format replies with their profiles
      const formattedReplies = commentReplies.map(reply => {
        const replyProfile = replyProfiles?.find(p => p.id === reply.user_id);
        
        return {
          ...reply,
          profiles: replyProfile ? {
            first_name: replyProfile.first_name,
            last_name: replyProfile.last_name
          } : undefined
        } as Comment;
      });
      
      return {
        ...comment,
        profiles: profile ? {
          first_name: profile.first_name,
          last_name: profile.last_name
        } : undefined,
        replies: formattedReplies
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
    await incrementColumnValue(postId, 'community_posts', 'comments');
    
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
    return await incrementColumnValue(commentId, 'community_comments', 'likes');
  } catch (error) {
    console.error('Exception in likeComment:', error);
    return false;
  }
}
