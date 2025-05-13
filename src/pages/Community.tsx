
import React from 'react';
import { default as CommunityComponent } from '@/components/community/Community';
import { CommunityProvider } from '@/contexts/community/CommunityContext';

// This component is imported in App.tsx as Community
const Community = () => {
  return (
    <CommunityProvider>
      <CommunityComponent />
    </CommunityProvider>
  );
};

export default Community;
