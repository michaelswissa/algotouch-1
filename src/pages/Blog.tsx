
import React from 'react';
import Layout from '@/components/Layout';
import BlogSection from '@/components/BlogSection';
import { Card, CardContent } from '@/components/ui/card';

const Blog = () => {
  return (
    <Layout>
      <div className="tradervue-container py-6">
        <h1 className="text-3xl font-bold mb-8 flex items-center">
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">בלוג</span>
        </h1>
        
        <Card className="mb-6">
          <CardContent className="p-6">
            <BlogSection expandedView={true} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Blog;
