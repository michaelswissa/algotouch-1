
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmailTestResult } from './types';

interface ResultCardProps {
  result: EmailTestResult | null;
}

const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  if (!result) return null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>תוצאות הבדיקה</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="bg-muted p-4 rounded-md overflow-auto text-xs leading-relaxed" dir="ltr">
          {JSON.stringify(result, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
};

export default ResultCard;
