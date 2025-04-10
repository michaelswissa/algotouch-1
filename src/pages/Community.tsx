
import React from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/auth';
import { CommunityProvider } from '@/contexts/community/CommunityContext';
import { UserProfile } from '@/components/community/UserProfile';
import { NewPostForm } from '@/components/community/NewPostForm';
import { PostList } from '@/components/community/PostList';
import { CommunityLeaderboard } from '@/components/community/CommunityLeaderboard';
import { InfoCards } from '@/components/community/InfoCards';

const Community = () => {
  return (
    <Layout>
      <CommunityProvider>
        <CommunityContent />
      </CommunityProvider>
    </Layout>
  );
};

// Separate component to use the CommunityContext
const CommunityContent = () => {
  const { user, isAuthenticated } = useAuth();
  
  return (
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
            <UserProfile user={user} />
          )}
          
          {/* New post creation card */}
          <NewPostForm user={user} />
          
          {/* Discussion posts */}
          <PostList />
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
  );
};

export default Community;
