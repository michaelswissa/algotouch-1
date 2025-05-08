
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/auth';
import { CommunityProvider } from '@/contexts/community/CommunityContext';
import { UserProfile } from '@/components/community/UserProfile';
import { NewPostForm } from '@/components/community/NewPostForm';
import { PostList } from '@/components/community/PostList';
import { CommunityLeaderboard } from '@/components/community/CommunityLeaderboard';
import { InfoCards } from '@/components/community/InfoCards';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, TrendingUp, Flame } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCommunity } from '@/contexts/community/CommunityContext';
import { Separator } from '@/components/ui/separator';

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
  const { tags } = useCommunity();
  const [activeTab, setActiveTab] = useState("latest");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const handleTagToggle = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(prev => prev.filter(t => t !== tagName));
    } else {
      setSelectedTags(prev => [...prev, tagName]);
    }
  };
  
  return (
    <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">קהילה</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Flame className="mr-2 h-4 w-4" /> פופולרי
          </Button>
          <Button variant="outline">
            <TrendingUp className="mr-2 h-4 w-4" /> עכשיו
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main discussions column */}
        <div className="lg:col-span-2 space-y-6">
          {/* User profile and stats card */}
          {isAuthenticated && (
            <UserProfile user={user} />
          )}
          
          {/* New post creation card */}
          <NewPostForm user={user} />
          
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="חיפוש בפוסטים..." 
                className="pl-8" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" className="gap-1">
                <Filter className="h-4 w-4" /> סינון
              </Button>
              <Tabs defaultValue="latest" onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="latest">חדש</TabsTrigger>
                  <TabsTrigger value="popular">פופולרי</TabsTrigger>
                  <TabsTrigger value="following">עוקב</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          {/* Tags filter */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <p className="text-sm font-medium text-muted-foreground my-auto">סנן לפי תגית:</p>
              {tags.slice(0, 10).map(tag => (
                <Badge 
                  key={tag.id} 
                  variant={selectedTags.includes(tag.name) ? "default" : "outline"} 
                  className="cursor-pointer"
                  onClick={() => handleTagToggle(tag.name)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
          
          <Separator />
          
          {/* Discussion posts */}
          <Tabs value={activeTab}>
            <TabsContent value="latest" className="mt-0">
              <PostList />
            </TabsContent>
            <TabsContent value="popular" className="mt-0">
              <div className="text-center py-8 text-muted-foreground">
                הפוסטים הפופולריים יוצגו כאן
              </div>
            </TabsContent>
            <TabsContent value="following" className="mt-0">
              <div className="text-center py-8 text-muted-foreground">
                פוסטים מחברים שאתה עוקב אחריהם יוצגו כאן
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">מידע קהילתי</h2>
          
          {/* Leaderboard */}
          <CommunityLeaderboard />
          
          {/* Info and Events Cards */}
          <InfoCards />
          
          {/* Community statistics */}
          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-medium mb-3">סטטיסטיקות הקהילה</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-bold">243</p>
                <p className="text-xs text-muted-foreground">חברים</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-bold">1.2K</p>
                <p className="text-xs text-muted-foreground">פוסטים</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-bold">56</p>
                <p className="text-xs text-muted-foreground">פוסטים היום</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-bold">87%</p>
                <p className="text-xs text-muted-foreground">חיובי</p>
              </div>
            </div>
          </div>
          
          {/* Trending tags */}
          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-medium mb-3">תגיות פופולריות</h3>
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 12).map(tag => (
                <Badge key={tag.id} variant="secondary">{tag.name}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;
