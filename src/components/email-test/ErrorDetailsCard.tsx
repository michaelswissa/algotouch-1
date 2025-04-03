
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorDetailsCardProps {
  title: string;
  errorDetails: string;
  className?: string;
}

const ErrorDetailsCard: React.FC<ErrorDetailsCardProps> = ({
  title,
  errorDetails,
  className = "border-red-500/50 bg-red-500/5 mb-8"
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-red-600 dark:text-red-400">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="bg-red-950/10 p-4 rounded-md overflow-auto text-xs leading-relaxed text-red-600 dark:text-red-400" dir="ltr">
          {errorDetails}
        </pre>
      </CardContent>
    </Card>
  );
};

export default ErrorDetailsCard;
