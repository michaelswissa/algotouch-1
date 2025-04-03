
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

interface SubscriptionCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  showSubscribeButton?: boolean;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ 
  title, 
  description, 
  children,
  showSubscribeButton = false 
}) => {
  return (
    <Card className="overflow-hidden" dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
};

export default SubscriptionCard;
