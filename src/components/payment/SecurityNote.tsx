
import React from 'react';
import { ShieldCheck, LockKeyhole } from 'lucide-react';

const SecurityNote: React.FC = () => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 p-2 rounded-md">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span>כל פרטי התשלום מוצפנים ומאובטחים</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground justify-center">
        <LockKeyhole className="h-3 w-3" />
        <span>מאובטח בתקן PCI-DSS</span>
      </div>
    </div>
  );
};

export default SecurityNote;
