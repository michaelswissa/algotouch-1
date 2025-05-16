
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ManualWebhookProcessor = () => {
  const [webhookId, setWebhookId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>('');

  const processWebhook = async () => {
    if (!webhookId && !email && !userId) {
      toast.error('Please provide either a webhook ID, user ID or an email');
      return;
    }
    
    try {
      setIsLoading(true);
      setResult('');
      
      const { data, error } = await supabase.functions.invoke('process-webhook', {
        body: { 
          webhookId: webhookId || undefined,
          userId: userId || undefined,
          email: email || undefined
        }
      });
      
      if (error) {
        toast.error(`Error processing webhook: ${error.message}`);
        setResult(`Error: ${error.message}`);
        return;
      }
      
      setResult(JSON.stringify(data, null, 2));
      
      if (data.success) {
        toast.success('Webhook processed successfully');
      } else {
        toast.error(`Failed to process webhook: ${data.message}`);
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      toast.error('An unexpected error occurred');
      setResult(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="webhook-id">Webhook ID</Label>
        <Input 
          id="webhook-id"
          value={webhookId}
          onChange={(e) => setWebhookId(e.target.value)}
          placeholder="4fcd18c4-9719-49a0-b70c-841f1e0e4686"
          disabled={isLoading}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="user-id">User ID (optional)</Label>
        <Input 
          id="user-id"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="0d26a52f-9043-4efe-a2ee-8e3cb1a65478"
          disabled={isLoading}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input 
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          disabled={isLoading}
        />
      </div>
      
      <Button 
        onClick={processWebhook}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : 'Process Webhook'}
      </Button>
      
      {result && (
        <div className="mt-4">
          <Label>Result:</Label>
          <div className="p-4 bg-muted rounded-md mt-2">
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualWebhookProcessor;
