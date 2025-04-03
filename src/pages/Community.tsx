
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { 
  awardPoints, 
  ACTIVITY_TYPES, 
  getUserReputation, 
  getUserBadges,
  getAllBadges,
  getCommunityPosts 
} from '@/lib/community';
import { supabase } from '@/integrations/supabase/client';

// Component imports
import { UserProfile } from '@/components/community/UserProfile';
import { NewPostForm } from '@/components/community/NewPostForm';
import { PostList } from '@/components/community/PostList';
import { CommunityLeaderboard } from '@/components/community/CommunityLeaderboard';
import { InfoCards } from '@/components/community/InfoCards';

const Community = () => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [userBadges, setUserBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  
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
        .eq('activity_type', ACTIVITY_TYPES.DAILY_LOGIN.toString())
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
  
  // Function to refresh data after post creation
  const handlePostCreated = async () => {
    setLoading(true);
    try {
      const fetchedPosts = await getCommunityPosts();
      setPosts(fetchedPosts);
      
      if (isAuthenticated && user) {
        const reputation = await getUserReputation(user.id);
        if (reputation) {
          setUserPoints(reputation.points);
          setUserLevel(reputation.level);
        }
        
        const badges = await getUserBadges(user.id);
        setUserBadges(badges);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle post likes
  const handlePostLiked = async (postId) => {
    const updatedPosts = await getCommunityPosts();
    setPosts(updatedPosts);
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
              <UserProfile 
                user={user}
                userLevel={userLevel}
                userPoints={userPoints}
                userBadges={userBadges}
                allBadges={allBadges}
              />
            )}
            
            {/* New post creation card */}
            <NewPostForm 
              user={user}
              isAuthenticated={isAuthenticated}
              loading={loading}
              onPostCreated={handlePostCreated}
            />
            
            {/* Discussion posts */}
            <PostList 
              posts={posts}
              loading={loading}
              isAuthenticated={isAuthenticated}
              userId={user?.id}
              onPostLiked={handlePostLiked}
            />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">מידע קהילתי</h2>
            
            {/* Leaderboard */}
            <CommunityLeaderboard />
            
            {/* Info and Events Cards */}
            <InfoCards />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Community;
