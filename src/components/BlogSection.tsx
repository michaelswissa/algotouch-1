
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBlogPostsWithRefresh } from '@/lib/api/blog';
import { ChevronRight, Clock, ThumbsUp, MessageSquare, Bookmark, Share } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BlogSectionProps {
  expandedView?: boolean;
}

const BlogSection = ({ expandedView = false }: BlogSectionProps) => {
  const { blogPosts, loading: isLoading } = useBlogPostsWithRefresh();
  
  // Show more posts in expanded view
  const postsToShow = expandedView ? blogPosts : blogPosts.slice(0, 3);
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">פוסטים אחרונים</h2>
        {!expandedView && (
          <Link to="/blog">
            <Button variant="link" className="text-primary flex items-center gap-1 p-0 h-auto">
              <span>לכל הפוסטים</span>
              <ChevronRight size={16} className="rtl-flip" />
            </Button>
          </Link>
        )}
      </div>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">הכל</TabsTrigger>
          <TabsTrigger value="news">חדשות ועדכונים</TabsTrigger>
          <TabsTrigger value="market">סיקורי שוק</TabsTrigger>
          <TabsTrigger value="guides">מדריכים וטיפים</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="hover-scale">
                  <CardContent className="p-4">
                    <div className="animate-pulse">
                      <div className="h-40 bg-muted rounded mb-3"></div>
                      <div className="h-6 bg-muted rounded mb-2 w-3/4"></div>
                      <div className="h-4 bg-muted rounded mb-1"></div>
                      <div className="h-4 bg-muted rounded mb-1 w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className={cn(
              "grid gap-4",
              expandedView 
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}>
              {postsToShow.map((post) => (
                <Link key={post.id} to={`/blog/${post.id}`} className="block">
                  <Card className="overflow-hidden hover-scale transition-all duration-300 h-full">
                    <div className="relative h-40 overflow-hidden">
                      <img 
                        src={post.coverImage} 
                        alt={post.title}
                        className="object-cover w-full h-full transition-transform duration-500 hover:scale-110"
                      />
                      <div className="absolute top-2 right-2 bg-primary/80 text-white text-xs px-2 py-1 rounded">
                        {post.tags[0] || "כללי"}
                      </div>
                    </div>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-lg font-bold line-clamp-2">{post.title}</CardTitle>
                      <CardDescription className="flex items-center text-xs mt-1">
                        <Clock size={12} className="ml-1" />
                        <span>{post.date}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-sm line-clamp-2">{post.excerpt}</p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between">
                      <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ThumbsUp size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MessageSquare size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Bookmark size={14} />
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Share size={14} />
                      </Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
          
          {expandedView && blogPosts.length > 0 && (
            <div className="flex justify-center mt-8">
              <Button variant="outline">טען עוד</Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="news">
          <div className="p-8 text-center text-muted-foreground">
            חדשות ועדכונים יופיעו כאן בקרוב
          </div>
        </TabsContent>
        
        <TabsContent value="market">
          <div className="p-8 text-center text-muted-foreground">
            סיקורי שוק יופיעו כאן בקרוב
          </div>
        </TabsContent>
        
        <TabsContent value="guides">
          <div className="p-8 text-center text-muted-foreground">
            מדריכים וטיפים יופיעו כאן בקרוב
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BlogSection;
