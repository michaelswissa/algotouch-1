
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

function IframeRedirect() {
  const { toast } = useToast();

  React.useEffect(() => {
    // Show loading toast
    toast({
      title: "מתחיל תהליך תשלום",
      description: "אנחנו מתחילים את תהליך התשלום, אנא המתן...",
      duration: 3000,
    });
    
    // Handle iframe redirect logic here
    console.log("IframeRedirect component mounted");
  }, [toast]);

  return (
    <Layout hideSidebar={true}>
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-center">מעבר לדף התשלום</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-center mb-4">אנו מכינים את דף התשלום עבורך...</p>
            <p className="text-sm text-muted-foreground text-center">אנא המתן, אתה תועבר באופן אוטומטי</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default IframeRedirect;
