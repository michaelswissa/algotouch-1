
import React from 'react';
import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ManualWebhookProcessor from '@/components/payment/ManualWebhookProcessor';

const AdminTools: React.FC = () => {
  return (
    <div className="container py-8">
      <PageTitle>כלי ניהול</PageTitle>
      
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>תיקון תשלום</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-muted-foreground">
                כלי זה מעבד מחדש webhook תשלום שלא עובד עבור משתמש ספציפי.
              </p>
              
              <ManualWebhookProcessor />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminTools;
