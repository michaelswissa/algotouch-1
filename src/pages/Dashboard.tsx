
import React, { Suspense } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Lazy loaded components with error boundaries
const DynamicCourses = React.lazy(() => 
  import('@/components/Courses').catch(err => {
    console.error("Error loading Courses component:", err);
    return { default: () => <ErrorFallback componentName="Courses" /> };
  })
);

const DynamicBlogSection = React.lazy(() => 
  import('@/components/BlogSection').catch(err => {
    console.error("Error loading BlogSection component:", err);
    return { default: () => <ErrorFallback componentName="Blog Posts" /> };
  })
);

// Error fallback component
const ErrorFallback = ({ componentName }: { componentName: string }) => (
  <Card className="p-4 border-red-300 bg-red-50 dark:bg-red-900/10">
    <p className="text-red-600 dark:text-red-400">שגיאה בטעינת רכיב {componentName}. נסה לרענן את הדף.</p>
    <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
      <RefreshCw size={14} className="mr-1" /> נסה שוב
    </Button>
  </Card>
);

// Loading fallback
const LoadingFallback = () => (
  <div className="w-full h-32 flex items-center justify-center">
    <div className="h-8 w-8 rounded-full border-4 border-t-primary animate-spin"></div>
  </div>
);

const Dashboard = () => {
  const { toast } = useToast();

  const handleManualRefresh = () => {
    window.location.reload();
    toast({
      title: "מרענן נתונים",
      description: "הנתונים מתעדכנים...",
      duration: 2000,
    });
  };

  return (
    <Layout>
      <div className="tradervue-container py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-8 flex items-center">
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">לוח בקרה</span>
          </h1>
          <Button 
            onClick={handleManualRefresh} 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 mb-8"
          >
            <RefreshCw size={14} className="mr-1" />
            <span>רענן נתונים</span>
          </Button>
        </div>
        
        {/* Stock Indices Section - Simplified for reliability */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">מדדים בזמן אמת</h2>
          </div>
          
          <Card className="p-4">
            <p>נתוני מדדים יוצגו כאן לאחר טעינה מוצלחת.</p>
            <Button variant="outline" className="mt-2" onClick={handleManualRefresh}>
              <RefreshCw size={14} className="mr-1" /> טען נתונים
            </Button>
          </Card>
        </div>
        
        {/* Blog Section */}
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">פוסטים אחרונים</h2>
          </div>
          <Suspense fallback={<LoadingFallback />}>
            <DynamicBlogSection />
          </Suspense>
        </div>
        
        {/* Courses Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">קורסים דיגיטליים</h2>
          <Suspense fallback={<LoadingFallback />}>
            <DynamicCourses />
          </Suspense>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
