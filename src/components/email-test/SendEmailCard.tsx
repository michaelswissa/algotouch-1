
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ConnectionStatus } from './types';

interface SendEmailCardProps {
  title: string;
  description: string;
  onSend: (recipient: string) => Promise<void>;
  isLoading: boolean;
  connectionStatus: ConnectionStatus;
  initialRecipient?: string;
}

const SendEmailCard: React.FC<SendEmailCardProps> = ({
  title,
  description,
  onSend,
  isLoading,
  connectionStatus,
  initialRecipient = 'support@algotouch.co.il'
}) => {
  const [recipient, setRecipient] = useState(initialRecipient);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label htmlFor="recipient" className="block mb-2 font-medium">כתובת הנמען</label>
            <Input 
              id="recipient"
              value={recipient} 
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="דוא״ל הנמען"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => onSend(recipient)} 
          disabled={isLoading || !recipient || connectionStatus === 'error'}
          className="w-full"
        >
          {isLoading ? 'שולח מייל...' : 'שלח מייל בדיקה'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SendEmailCard;
