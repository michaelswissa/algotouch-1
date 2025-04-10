
import React from 'react';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

const SubscriptionFooter: React.FC = () => {
  return (
    <div className="border-t bg-muted/20 p-3 flex justify-between">
      <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
        <XCircle className="h-4 w-4" />
        ביטול מנוי
      </Button>
      <Button variant="outline" size="sm">
        שינוי תכנית
      </Button>
    </div>
  );
};

export default SubscriptionFooter;
