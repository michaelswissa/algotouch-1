
import React from 'react';
import { ShieldCheck } from 'lucide-react';

const SecurityNote: React.FC = () => {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 p-2 rounded-md">
      <ShieldCheck className="h-4 w-4 text-primary" />
      <span>כל פרטי התשלום מוצפנים ומאובטחים</span>
    </div>
  );
};

export default SecurityNote;
