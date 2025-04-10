
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image, Link2, Send } from 'lucide-react';
import { registerCommunityPost } from '@/lib/community';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import { useCommunity } from '@/contexts/community/CommunityContext';

interface NewPostFormProps {
  user: {
    id: string;
    email?: string;
  } | null;
}

export function NewPostForm({ user }: NewPostFormProps) {
  const { isAuthenticated } = useAuth();
  const { loading, handlePostCreated } = useCommunity();
  const [newPostContent, setNewPostContent] = useState('');
  
  const handleCreatePost = async () => {
    if (!isAuthenticated) {
      toast.error('יש להתחבר כדי לפרסם');
      return;
    }
    
    if (!newPostContent.trim()) {
      toast.error('לא ניתן לפרסם פוסט ריק');
      return;
    }

    try {
      const postId = await registerCommunityPost(
        user!.id,
        newPostContent.split('\n')[0] || 'פוסט חדש',
        newPostContent
      );
      
      if (postId) {
        setNewPostContent('');
        await handlePostCreated();
        toast.success('הפוסט פורסם בהצלחה!');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('שגיאה בפרסום הפוסט');
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={isAuthenticated ? `https://avatar.vercel.sh/${user?.id}?size=40` : "https://i.pravatar.cc/150?img=30"} />
            <AvatarFallback>{user?.email?.charAt(0) || 'G'}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <Textarea
              placeholder={isAuthenticated ? "שתף את המחשבות שלך..." : "התחבר כדי לפרסם..."}
              className="min-h-[100px] resize-none mb-3 border-gray-200"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              disabled={!isAuthenticated || loading}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" disabled={!isAuthenticated || loading}>
                  <Image size={16} />
                  תמונה
                </Button>
                <Button variant="outline" size="sm" className="gap-1" disabled={!isAuthenticated || loading}>
                  <Link2 size={16} />
                  קישור
                </Button>
              </div>
              <Button 
                onClick={handleCreatePost} 
                className="gap-1" 
                disabled={!isAuthenticated || loading || !newPostContent.trim()}
              >
                <Send size={16} />
                פרסם {isAuthenticated && "(+10 נקודות)"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
