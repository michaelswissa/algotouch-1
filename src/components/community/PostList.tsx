
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Share2, ThumbsUp } from 'lucide-react';
import { likePost } from '@/lib/community';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import { useCommunity } from '@/contexts/community/CommunityContext';

export function PostList() {
  const { isAuthenticated, user } = useAuth();
  const { posts, loading, handlePostLiked } = useCommunity();

  // Helper function to format post time
  const formatPostTime = (timeString: string) => {
    const postTime = new Date(timeString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - postTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'כרגע';
    if (diffInMinutes < 60) return `לפני ${diffInMinutes} דקות`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `לפני ${diffInHours} שעות`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `לפני ${diffInDays} ימים`;
  };
  
  // Helper function to format user name
  const formatUserName = (post: any) => {
    if (post.profiles?.first_name || post.profiles?.last_name) {
      return `${post.profiles.first_name || ''} ${post.profiles.last_name || ''}`.trim();
    }
    return `סוחר${post.user_id.substring(0, 4)}`;
  };
  
  // Function to handle liking a post
  const handleLikePostClick = async (postId: string) => {
    if (!isAuthenticated) {
      toast.error('יש להתחבר כדי לבצע פעולה זו');
      return;
    }
    
    try {
      const success = await likePost(postId, user!.id);
      
      if (success) {
        await handlePostLiked(postId);
        toast.success('הוספת לייק לפוסט!');
      }
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('שגיאה בהוספת לייק לפוסט');
    }
  };
  
  if (loading && posts.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="overflow-hidden animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="flex-1">
                  <div className="h-5 w-1/3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-1/4 bg-gray-100 rounded mb-4"></div>
                  <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-5/6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-2/3 bg-gray-200 rounded mb-4"></div>
                  <div className="flex gap-4 mt-4">
                    <div className="h-8 w-16 bg-gray-100 rounded"></div>
                    <div className="h-8 w-16 bg-gray-100 rounded"></div>
                    <div className="h-8 w-16 bg-gray-100 rounded"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (posts.length === 0 && !loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground py-8">
            עדיין אין פוסטים בקהילה. היה הראשון לפרסם!
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {posts.map(post => (
        <Card key={post.id} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://avatar.vercel.sh/${post.user_id}?size=40`} />
                <AvatarFallback>{formatUserName(post).charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium">@{formatUserName(post)}</h3>
                    <p className="text-sm text-gray-500">{formatPostTime(post.created_at)}</p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <h4 className="font-semibold text-lg mb-2">{post.title}</h4>
                  <p className="text-gray-700">{post.content}</p>
                </div>
                
                <div className="flex mt-4 gap-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={() => handleLikePostClick(post.id)}
                    disabled={loading || !isAuthenticated}
                  >
                    <ThumbsUp size={16} /> {post.likes}
                  </Button>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1">
                    <MessageSquare size={16} /> {post.comments}
                  </Button>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1">
                    <Share2 size={16} /> שתף
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
