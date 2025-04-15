
import React from 'react';
import { Card } from '@/components/ui/card';

const SecurityNote: React.FC = () => {
  return (
    <Card className="bg-gray-50 dark:bg-gray-900 p-3">
      <p className="text-xs text-muted-foreground flex items-center">
        <span className="mr-1">🔒</span>
        פרטי התשלום מאובטחים ומוצפנים בתקן PCI DSS. הכרטיס יחויב רק לאחר אישור.
      </p>
    </Card>
  );
};

export default SecurityNote;
