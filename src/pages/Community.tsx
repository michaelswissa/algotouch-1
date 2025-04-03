import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, ThumbsUp, Share2, Send, Image, Link2, Award } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import { 
  awardPoints, 
  ACTIVITY_TYPES, 
  getUserReputation, 
  getUserBadges,
  getAllBadges,
  registerCommunityPost,
  likePost,
  getCommunityPosts 
} from '@/lib/reputation-service';
import { LevelIndicator } from '@/components/ui/level-indicator';
import UserBadges from '@/components/community/UserBadges';
import { CommunityLeaderboard } from '@/components/community/CommunityLeaderboard';
import { supabase } from '@/integrations/supabase/client';

interface Post {
  id: string;
  title: string;
  content: string;
  likes: number;
  comments: number;
  created_at: string;
  user_id: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

const Community = () => {
  const { user, isAuthenticated } = useAuth();
  const [newPostContent, setNewPostContent] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [allBadges, setAllBadges] = useState<any[]>([]);
  
  // Load initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Load posts
        const fetchedPosts = await getCommunityPosts();
        setPosts(fetchedPosts);
        
        if (isAuthenticated && user) {
          // Check and award daily login points
          await checkAndAwardDailyLogin();
          
          // Load user reputation
          const reputation = await getUserReputation(user.id);
          if (reputation) {
            setUserPoints(reputation.points);
            setUserLevel(reputation.level);
          }
          
          // Load user badges
          const badges = await getUserBadges(user.id);
          setUserBadges(badges);
          
          // Load all badges
          const availableBadges = await getAllBadges();
          setAllBadges(availableBadges);
        }
      } catch (error) {
        console.error('Error loading community data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [user, isAuthenticated]);
  
  // Function to check and award daily login points
  const checkAndAwardDailyLogin = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Check if user already got points today
      const { data } = await supabase
        .from('community_activities')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('activity_type', ACTIVITY_TYPES.DAILY_LOGIN)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .maybeSingle();
      
      if (!data) {
        // Award points for daily login
        const success = await awardPoints(user.id, ACTIVITY_TYPES.DAILY_LOGIN);
        if (success) {
          toast.success('קיבלת 2 נקודות על כניסה יומית!', {
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error('Error checking daily login:', error);
    }
  };
  
  // Function to handle creating a new post
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
      setLoading(true);
      
      const postId = await registerCommunityPost(
        user!.id,
        newPostContent.split('\n')[0] || 'פוסט חדש',
        newPostContent
      );
      
      if (postId) {
        // Refresh posts to include the new one
        const updatedPosts = await getCommunityPosts();
        setPosts(updatedPosts);
        
        // Update reputation
        const reputation = await getUserReputation(user!.id);
        if (reputation) {
          setUserPoints(reputation.points);
          setUserLevel(reputation.level);
        }
        
        // Check for new badges
        const badges = await getUserBadges(user!.id);
        setUserBadges(badges);
        
        setNewPostContent('');
        toast.success('הפוסט פורסם בהצלחה!');
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle liking a post
  const handleLikePost = async (postId: string) => {
    if (!isAuthenticated) {
      toast.error('יש להתחבר כדי לבצע פעולה זו');
      return;
    }
    
    try {
      setLoading(true);
      
      const success = await likePost(postId, user!.id);
      
      if (success) {
        // Update posts to reflect the new like count
        const updatedPosts = posts.map(post => {
          if (post.id === postId) {
            return { ...post, likes: post.likes + 1 };
          }
          return post;
        });
        
        setPosts(updatedPosts);
        toast.success('הוספת לייק לפוסט!');
      }
    } catch (error) {
      console.error('Error liking post:', error);
    } finally {
      setLoading(false);
    }
  };
  
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
  const formatUserName = (post: Post) => {
    if (post.profiles?.first_name || post.profiles?.last_name) {
      return `${post.profiles.first_name || ''} ${post.profiles.last_name || ''}`.trim();
    }
    return `סוחר${post.user_id.substring(0, 4)}`;
  };

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">קהילה</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main discussions column */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold">דיונים אחרונים</h2>
            
            {/* User profile and stats card */}
            {isAuthenticated && (
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={`https://avatar.vercel.sh/${user?.id || 'user'}?size=48`} />
                      <AvatarFallback>{user?.email?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{user?.email}</h3>
                      <LevelIndicator 
                        level={userLevel} 
                        points={userPoints} 
                        className="mt-2 max-w-sm" 
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">התגים שלך</h4>
                    <UserBadges 
                      earnedBadges={userBadges} 
                      allBadges={allBadges}
                      showLocked={true}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* New post creation card */}
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
            
            {/* Discussion posts */}
            {loading && posts.length === 0 ? (
              // Loading state
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
            ) : (
              // Actual posts
              posts.map(post => (
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
                            onClick={() => handleLikePost(post.id)}
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
              ))
            )}
            
            {posts.length === 0 && !loading && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground py-8">
                    עדיין אין פוסטים בקהילה. היה הראשון לפרסם!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">מידע קהילתי</h2>
            
            {/* Leaderboard */}
            <CommunityLeaderboard />
            
            {/* User level explanation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">איך עובדת המערכת?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Award className="h-5 w-5 text-primary mr-2" /> 
                      <h3 className="font-medium">צבירת נקודות ותגים</h3>
                    </div>
                    <p className="text-muted-foreground">
                      צבור נקודות על ידי פרסום תוכן, קבלת לייקים ופעילות יומיומית בקהילה. תגים חדשים יפתחו ככל שתצבור יותר נקודות.
                    </p>
                  </div>
                  
                  <div className="pt-2">
                    <h4 className="font-medium mb-1">פעולות ונקודות</h4>
                    <ul className="space-y-1">
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">פרסום פוסט</span>
                        <span className="font-medium">10 נקודות</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">קבלת לייק</span>
                        <span className="font-medium">5 נקודות</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">כניסה יומית</span>
                        <span className="font-medium">2 נקודות</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">השלמת פרופיל</span>
                        <span className="font-medium">15 נקודות</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Events card - keep from original */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">אירועים קרובים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-md p-3">
                    <p className="font-medium">וובינר: אסטרטגיות מסחר לשוק תנודתי</p>
                    <p className="text-sm text-gray-500 mt-1">21 ביוני, 19:00</p>
                    <Button variant="outline" size="sm" className="mt-2 w-full">הירשם</Button>
                  </div>
                  
                  <div className="border border-gray-200 rounded-md p-3">
                    <p className="font-medium">מפגש קהילה: שיתוף אסטרטגיות</p>
                    <p className="text-sm text-gray-500 mt-1">28 ביוני, 20:00</p>
                    <Button variant="outline" size="sm" className="mt-2 w-full">הירשם</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Community;
