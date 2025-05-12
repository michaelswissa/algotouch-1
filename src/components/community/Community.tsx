
import React from 'react';
import Layout from '@/components/Layout';
import CommunityLeaderboard from './CommunityLeaderboard';
import PostList from './PostList';
import NewPostForm from './NewPostForm';
import UserBadges from './UserBadges';
import InfoCards from './InfoCards';

const Community = () => {
  return (
    <Layout>
      <div className="tradervue-container py-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">קהילת סוחרים</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area - posts */}
          <div className="lg:col-span-2 space-y-6">
            <NewPostForm />
            <PostList />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <InfoCards />
            <CommunityLeaderboard />
            <UserBadges />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Community;
