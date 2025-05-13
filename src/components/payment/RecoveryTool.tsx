
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';

interface RecoveryToolProps {
  onComplete?: (result: any) => void;
}

export const RecoveryTool: React.FC<RecoveryToolProps> = ({ onComplete }) => {
  const [email, setEmail] = useState('');
  const [profileId, setProfileId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReprocessByEmail = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('reprocess-webhook-by-email', {
        body: { email }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setResult(data);
      
      if (data.success) {
        toast.success(`Reprocessed ${data.results?.length || 0} webhooks successfully`);
        if (data.tokenStatus?.found) {
          toast.success('Token found and saved in system!');
        }
      } else {
        toast.error(data.message || 'Failed to reprocess webhooks');
      }
      
      if (onComplete) {
        onComplete(data);
      }
    } catch (err: any) {
      console.error('Error reprocessing webhooks:', err);
      setError(err.message || 'Error reprocessing webhooks');
      toast.error('Failed to reprocess webhooks');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReprocessByProfileId = async () => {
    if (!profileId) {
      setError('Low Profile ID is required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('reprocess-webhook-by-email', {
        body: { lowProfileId: profileId }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setResult(data);
      
      if (data.success) {
        toast.success(`Reprocessed ${data.results?.length || 0} webhooks successfully`);
        if (data.tokenStatus?.found) {
          toast.success('Token found and saved in system!');
        }
      } else {
        toast.error(data.message || 'Failed to reprocess webhooks');
      }
      
      if (onComplete) {
        onComplete(data);
      }
    } catch (err: any) {
      console.error('Error reprocessing webhooks:', err);
      setError(err.message || 'Error reprocessing webhooks');
      toast.error('Failed to reprocess webhooks');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Webhook Reprocessing Tool</CardTitle>
        <CardDescription>
          Reprocess webhooks for a user by email or low profile ID
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium">By Email</h3>
          <div className="flex space-x-2">
            <Input
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
            <Button onClick={handleReprocessByEmail} disabled={isLoading}>
              {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : 'Reprocess'}
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium">By Low Profile ID</h3>
          <div className="flex space-x-2">
            <Input
              placeholder="Low Profile ID"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              disabled={isLoading}
            />
            <Button onClick={handleReprocessByProfileId} disabled={isLoading}>
              {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : 'Reprocess'}
            </Button>
          </div>
        </div>
        
        {result && (
          <div className="mt-4 p-3 border rounded bg-muted">
            <h3 className="font-medium mb-2">Result</h3>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="outline" onClick={() => {
          setError(null);
          setResult(null);
          setEmail('');
          setProfileId('');
        }}>
          Clear
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RecoveryTool;
