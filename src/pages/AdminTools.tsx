
import React from 'react';
import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ManualWebhookProcessor from '@/components/payment/ManualWebhookProcessor';
import WebhookProcessor from '@/components/payment/WebhookProcessor';

const AdminTools = () => {
  return (
    <div className="container py-8">
      <PageTitle>כלי ניהול</PageTitle>
      
      <Tabs defaultValue="auto-processor" className="mt-6">
        <TabsList className="mb-4">
          <TabsTrigger value="auto-processor">עיבוד אוטומטי</TabsTrigger>
          <TabsTrigger value="manual-processor">עיבוד ידני</TabsTrigger>
        </TabsList>
        
        <TabsContent value="auto-processor">
          <div className="grid md:grid-cols-1 gap-6">
            <WebhookProcessor />
          </div>
        </TabsContent>
        
        <TabsContent value="manual-processor">
          <div className="grid md:grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>תיקון תשלום ידני</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-muted-foreground">
                  כלי זה מעבד מחדש webhook תשלום שלא עובד עבור משתמש ספציפי.
                </p>
                
                <ManualWebhookProcessor />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTools;
