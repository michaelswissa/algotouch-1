
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import CardcomIframeRedirect from '@/components/CardcomIframeRedirect';
import { Card, CardContent } from '@/components/ui/card';

const IframeRedirect = () => {
  const [searchParams] = useSearchParams();
  const terminalNumber = parseInt(searchParams.get('terminalNumber') || '0');
  const apiName = searchParams.get('apiName') || '';
  const amount = parseFloat(searchParams.get('amount') || '0');
  const successUrl = searchParams.get('successUrl') || '';
  const errorUrl = searchParams.get('errorUrl') || '';
  const webhookUrl = searchParams.get('webhookUrl') || '';
  const productName = searchParams.get('productName') || 'TraderVue Subscription';
  const returnValue = searchParams.get('returnValue') || '';
  
  if (!terminalNumber || !apiName || !amount || !successUrl || !errorUrl || !webhookUrl) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h1 className="text-xl font-semibold mb-4">חסרים פרטים נדרשים</h1>
            <p>נדרשים פרמטרים: terminalNumber, apiName, amount, successUrl, errorUrl, webhookUrl</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">מעבר לדף התשלום</h1>
      
      <CardcomIframeRedirect
        terminalNumber={terminalNumber}
        apiName={apiName}
        amount={amount}
        successUrl={successUrl}
        errorUrl={errorUrl}
        webhookUrl={webhookUrl}
        productName={productName}
        returnValue={returnValue}
        language="he"
      />
    </div>
  );
};

export default IframeRedirect;
