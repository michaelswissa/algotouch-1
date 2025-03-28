
import React from 'react';
import { useBlogPostsWithRefresh } from '@/lib/api/blog';
import { Card, CardContent } from '@/components/ui/card';
import { Tag, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const BlogSection = () => {
  const { blogPosts, loading, error } = useBlogPostsWithRefresh();

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Tag size={18} className="text-primary" />
          <span>הבלוג שלנו</span>
        </h2>
        <Button variant="link" size="sm" className="text-primary">
          לכל הפוסטים
        </Button>
      </div>
      
      {loading && blogPosts.length === 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="p-4">
                <div className="w-3/4 h-5 bg-muted rounded mb-2"></div>
                <div className="flex gap-2 mb-2">
                  <div className="w-20 h-4 bg-muted rounded"></div>
                  <div className="w-24 h-4 bg-muted rounded"></div>
                </div>
                <div className="w-full h-16 bg-muted rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-4 border-red-300 bg-red-50 dark:bg-red-900/10">
          <p className="text-red-600 dark:text-red-400">שגיאה בטעינת פוסטים. נסה לרענן את הדף.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {blogPosts.slice(0, 3).map(post => (
            <Card key={post.id} className="overflow-hidden hover:border-primary/50 transition-all duration-200 hover-scale">
              <CardContent className="p-0">
                <a href={post.url} className="block">
                  <div className="p-4">
                    <h3 className="font-medium text-foreground text-lg mb-2">{post.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{post.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User size={14} />
                        <span>{post.author}</span>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-3">{post.excerpt}</p>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogSection;
