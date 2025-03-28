import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Calendar, User, Tag, ThumbsUp, MessageSquare, Bookmark, Share } from 'lucide-react';
import { useBlogPostsWithRefresh } from '@/lib/api/blog';

const stockMarketImages = [
  '/images/stock-market-1.jpg',
  '/images/stock-market-2.jpg',
  '/images/stock-market-3.jpg',
  '/images/stock-market-4.jpg',
  '/images/stock-market-5.jpg',
  '/images/stock-market-6.jpg',
];

const BlogPost = () => {
  const { id } = useParams();
  const { blogPosts, loading: isLoading } = useBlogPostsWithRefresh();
  
  const post = blogPosts.find(post => post.id === Number(id));
  
  const getConsistentImage = (post: any, postIndex: number) => {
    if (!post?.coverImage || post.coverImage.includes('unsplash.com')) {
      return stockMarketImages[postIndex % stockMarketImages.length];
    }
    return post.coverImage;
  };
  
  const postIndex = blogPosts.findIndex(p => p.id === Number(id));
  const coverImage = post ? getConsistentImage(post, postIndex >= 0 ? postIndex : 0) : '';
  
  return (
    <Layout>
      <div className="tradervue-container py-6">
        <div className="flex items-center mb-6 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-primary">ראשי</Link>
          <ChevronRight size={16} className="mx-2 rtl-flip text-muted-foreground" />
          <Link to="/blog" className="text-muted-foreground hover:text-primary">בלוג</Link>
          <ChevronRight size={16} className="mx-2 rtl-flip text-muted-foreground" />
          <span className="text-foreground">{isLoading ? 'טוען...' : post?.title || 'פוסט לא נמצא'}</span>
        </div>
        
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-8 w-2/3 mb-4" />
              <div className="flex gap-4 mb-6">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-64 w-full mb-8" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ) : !post ? (
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-2xl font-bold mb-4">פוסט לא נמצא</h2>
              <p className="mb-6">הפוסט שחיפשת אינו קיים או שהוסר.</p>
              <Link to="/blog">
                <Button>חזרה לבלוג</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div>
            <Card className="mb-6">
              <CardContent className="p-6">
                <h1 className="text-3xl font-bold mb-6">{post.title}</h1>
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-8">
                  <div className="flex items-center">
                    <Calendar size={16} className="ml-2" />
                    <span>{post.date}</span>
                  </div>
                  <div className="flex items-center">
                    <User size={16} className="ml-2" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center">
                    <Tag size={16} className="ml-2" />
                    <div className="flex gap-2">
                      {post.tags.map((tag, index) => (
                        <span key={index} className="bg-muted px-2 py-1 rounded-md text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="relative h-[300px] md:h-[400px] mb-8 overflow-hidden rounded-lg">
                  <img 
                    src={coverImage}
                    alt={post.title}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = stockMarketImages[0];
                    }}
                  />
                </div>
                
                <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
                  <p className="text-lg leading-relaxed mb-4">
                    {post.excerpt}
                  </p>
                  
                  <p className="mb-4">
                    לורם איפסום דולור סיט אמט, קונסקטורר אדיפיסינג אלית קולהע צופעט למרקוח איבן איף,
                    ברומץ כלרשט מיחוצים. קלאצי סחטיר בלובק. תצטנפל בלינדו למרקל אס לכימפו, דול, צוט ומעיוט - לפתיעם ברשג - ולתיעם
                    גדדיש. קוויז דומור ליאמום בלינך רוגצה. לפמעט מוסן מנת.
                  </p>
                  
                  <h2 className="text-2xl font-bold my-4">נקודות מפתח</h2>
                  
                  <ul className="list-disc mr-6 mb-4 space-y-2">
                    <li>לורם איפסום דולור סיט אמט, קונסקטורר אדיפיסינג אלית.</li>
                    <li>קולהע צופעט למרקוח איבן איף, ברומץ כלרשט מיחוצים.</li>
                    <li>קלאצי סחטיר בלובק, תצטנפל בלינדו למרקל אס לכימפו.</li>
                    <li>דול, צוט ומעיוט - לפתיעם ברשג - ולתיעם גדדיש.</li>
                  </ul>
                  
                  <p className="mb-4">
                    גולר מונפרר סוברט לורם שבצק יהול, לכנוץ בעריר גק ליץ, ושבעגט ליבם סולגק. בראיט ולחת צורק מונחף, בגורמי מגמש.
                    תרבנך וסתעד לכנו סתשם השמה - לתכי מורגם בורק? לתיג ישבעס.
                  </p>
                  
                  <blockquote className="bg-muted p-4 border-r-4 border-primary my-6">
                    <p className="italic">
                      "פורמל מספרשט נמרגי לופר מי, לורם איפסום דולור סיט אמט, קונסקטורר אדיפיסינג אלית."
                    </p>
                    <footer className="mt-2 font-bold">— מומחה שוק ההון</footer>
                  </blockquote>
                  
                  <h2 className="text-2xl font-bold my-4">סיכום</h2>
                  
                  <p>
                    לורם איפסום דולור סיט אמט, קונסקטורר אדיפיסינג אלית. סת אלמנקום ניסי נון ניבאה. דס איאקוליס וולופטה דיאם.
                    וסטיבולום אט דולור, קראס אגת לקטוס וואל אאוגו וסטיבולום סוליסי טידום בעליק. קונדימנטום קורוס בליקרה,
                    נונסטי קלובר בריקנה סטום, לפריקך תצטריק לרטי.
                  </p>
                </div>
                
                <div className="flex justify-between items-center border-t pt-6">
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <ThumbsUp size={16} />
                      <span>אהבתי</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <MessageSquare size={16} />
                      <span>תגובה</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Bookmark size={16} />
                      <span>שמור</span>
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Share size={16} />
                    <span>שתף</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">פוסטים נוספים שעשויים לעניין אותך</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {blogPosts
                  .filter(relatedPost => relatedPost.id !== post.id)
                  .slice(0, 3)
                  .map((relatedPost, idx) => {
                    const relatedIndex = blogPosts.findIndex(p => p.id === relatedPost.id);
                    const relatedImage = getConsistentImage(relatedPost, relatedIndex >= 0 ? relatedIndex : idx);
                    
                    return (
                      <Link key={relatedPost.id} to={`/blog/${relatedPost.id}`} className="block">
                        <Card className="hover-scale h-full">
                          <div className="h-32 overflow-hidden">
                            <img 
                              src={relatedImage}
                              alt={relatedPost.title} 
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = stockMarketImages[idx % stockMarketImages.length];
                              }}
                            />
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold line-clamp-2 mb-2">{relatedPost.title}</h3>
                            <p className="text-xs text-muted-foreground">{relatedPost.date}</p>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BlogPost;
