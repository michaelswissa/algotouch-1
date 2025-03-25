
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, ThumbsUp, Share2, Users, Award, Send, Image, Link2 } from 'lucide-react';
import { toast } from 'sonner';

const Community = () => {
  const [newPostContent, setNewPostContent] = useState('');
  const [posts, setPosts] = useState([
    {
      id: 1,
      author: 'סוחר1',
      authorAvatar: 'https://i.pravatar.cc/150?img=21',
      time: 'לפני 1 שעות',
      title: 'מה דעתכם על התנועה של AAPL היום?',
      content: 'שמתם לב לתנועה המשמעותית היום? אני חושב שזה בגלל...',
      likes: 12,
      comments: 5
    },
    {
      id: 2,
      author: 'סוחר2',
      authorAvatar: 'https://i.pravatar.cc/150?img=22',
      time: 'לפני 2 שעות',
      title: 'אסטרטגיה חדשה שאני בוחן למניות טכנולוגיה',
      content: 'אני בוחן אסטרטגיה חדשה לטווח הקצר שמתמקדת בתנועות מחיר בקצב מהיר...',
      likes: 8,
      comments: 3
    },
    {
      id: 3,
      author: 'סוחר3',
      authorAvatar: 'https://i.pravatar.cc/150?img=23',
      time: 'לפני 3 שעות',
      title: 'הודעה חשובה למשקיעים לטווח ארוך',
      content: 'לאחרונה חקרתי את האתגרים של השקעות ארוכות טווח בשוק הנוכחי והגעתי לכמה תובנות...',
      likes: 15,
      comments: 7
    }
  ]);

  const handleCreatePost = () => {
    if (!newPostContent.trim()) {
      toast.error('לא ניתן לפרסם פוסט ריק');
      return;
    }

    // Create a new post object
    const newPost = {
      id: Date.now(),
      author: 'המשתמש שלי',
      authorAvatar: 'https://i.pravatar.cc/150?img=30',
      time: 'כרגע',
      title: newPostContent.split('\n')[0] || 'פוסט חדש',
      content: newPostContent,
      likes: 0,
      comments: 0
    };

    // Add the new post to the beginning of the posts array
    setPosts([newPost, ...posts]);
    setNewPostContent('');
    toast.success('הפוסט פורסם בהצלחה!');
  };

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">קהילה</h1>
          <Button className="gap-2">
            <Users size={16} />
            הצטרף לקהילה
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main discussions column */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold">דיונים אחרונים</h2>
            
            {/* New post creation card */}
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="https://i.pravatar.cc/150?img=30" />
                    <AvatarFallback>ME</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <Textarea
                      placeholder="שתף את המחשבות שלך..."
                      className="min-h-[100px] resize-none mb-3 border-gray-200"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                    />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-1">
                          <Image size={16} />
                          תמונה
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Link2 size={16} />
                          קישור
                        </Button>
                      </div>
                      <Button onClick={handleCreatePost} className="gap-1">
                        <Send size={16} />
                        פרסם
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Discussion posts */}
            {posts.map(post => (
              <Card key={post.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.authorAvatar} />
                      <AvatarFallback>{post.author.charAt(0)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-medium">@{post.author}</h3>
                          <p className="text-sm text-gray-500">{post.time}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <h4 className="font-semibold text-lg mb-2">{post.title}</h4>
                        <p className="text-gray-700">{post.content}</p>
                      </div>
                      
                      <div className="flex mt-4 gap-4">
                        <Button variant="ghost" size="sm" className="flex items-center gap-1">
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
          
          {/* Sidebar */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">מידע קהילתי</h2>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">חברי קהילה מובילים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://i.pravatar.cc/150?img=${10 + i}`} />
                        <AvatarFallback>T{i}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">מנטור{i}@</p>
                        <p className="text-xs text-gray-500">
                          {i === 1 ? "456 פוסטים" : i === 2 ? "328 פוסטים" : "215 פוסטים"}
                        </p>
                      </div>
                      <Award className="h-5 w-5 text-amber-500" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
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
