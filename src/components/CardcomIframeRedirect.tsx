
import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

interface CardcomIframeRedirectProps {
  terminalNumber: number;
  apiName: string;
  amount: number;
  successUrl: string;
  errorUrl: string;
  webhookUrl: string;
  productName?: string;
  language?: string;
  returnValue?: string;
}

const CardcomIframeRedirect: React.FC<CardcomIframeRedirectProps> = ({
  terminalNumber,
  apiName,
  amount,
  successUrl,
  errorUrl,
  webhookUrl,
  productName = "AlgoTouch Subscription",
  language = "he",
  returnValue = ""
}) => {
  const [loading, setLoading] = useState(true);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to create the low profile URL
  const createLowProfileUrl = async () => {
    try {
      setLoading(true);
      // Building request body
      const requestBody = {
        TerminalNumber: terminalNumber,
        ApiName: apiName,
        Amount: amount,
        SuccessRedirectUrl: successUrl,
        FailedRedirectUrl: errorUrl,
        WebHookUrl: webhookUrl,
        ProductName: productName,
        Language: language,
        ReturnValue: returnValue,
        UIDefinition: {
          IsHideCardOwnerName: false,
          IsHideCardOwnerPhone: false,
          IsCardOwnerPhoneRequired: true,
          IsHideCardOwnerEmail: false,
          IsCardOwnerEmailRequired: true
        }
      };

      console.log("Creating payment URL with:", { 
        terminalNumber, apiName, amount, 
        successUrl: successUrl.substring(0, 30) + '...',
        errorUrl: errorUrl.substring(0, 30) + '...',
      });

      // Make the API call to Cardcom
      const response = await fetch('https://secure.cardcom.solutions/api/v1/LowProfile/Create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log("Cardcom API response:", data);

      if (data.ResponseCode === 0) {
        // Success - redirect to the URL
        setRedirectUrl(data.Url);
      } else {
        // Error
        setError(`Error: ${data.Description || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error creating payment URL:', err);
      setError('Error creating payment URL. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    createLowProfileUrl();
  }, []);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-center">מעבר למסך התשלום, אנא המתן...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={createLowProfileUrl}>נסה שוב</Button>
        </CardContent>
      </Card>
    );
  }

  if (redirectUrl) {
    // Use an iframe to load the Cardcom payment page
    return (
      <div className="w-full h-[600px] border rounded-lg overflow-hidden">
        <iframe 
          src={redirectUrl}
          title="Cardcom Payment"
          className="w-full h-full"
          allow="payment"
        />
      </div>
    );
  }

  return null;
};

export default CardcomIframeRedirect;
