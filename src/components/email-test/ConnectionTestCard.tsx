
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ConnectionStatus } from './types';

interface ConnectionTestCardProps {
  title: string;
  description: string;
  onTest: () => Promise<void>;
  isLoading: boolean;
  connectionStatus: ConnectionStatus;
}

const ConnectionTestCard: React.FC<ConnectionTestCardProps> = ({
  title,
  description,
  onTest,
  isLoading,
  connectionStatus
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button 
          onClick={onTest}
          disabled={isLoading}
          className="w-full"
          variant={connectionStatus === 'error' ? "destructive" : (connectionStatus === 'success' ? "default" : "default")}
        >
          {isLoading ? 'בדיקה מתבצעת...' : `בדוק חיבור ${title.includes('SMTP') ? 'SMTP' : 'Gmail API'}`}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ConnectionTestCard;
