
import React from 'react';
import { Loader2 } from 'lucide-react';

const ProcessingPayment = () => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p>מעבד את התשלום, אנא המתן...</p>
      <p className="text-sm text-muted-foreground mt-2">אל תסגור את החלון זה</p>
    </div>
  );
};

export default ProcessingPayment;
