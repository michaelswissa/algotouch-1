
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentDiagnosticsProps {
  diagnosticInfo: any;
  onRefresh: () => void;
  isVisible?: boolean;
}

const PaymentDiagnostics: React.FC<PaymentDiagnosticsProps> = ({ 
  diagnosticInfo,
  onRefresh,
  isVisible = false
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  if (!isVisible) return null;
  
  const getStatusBadge = () => {
    if (!diagnosticInfo) {
      return <Badge variant="outline" className="bg-gray-100">בטעינה...</Badge>;
    }
    
    if (diagnosticInfo.status === 'success') {
      return <Badge variant="outline" className="bg-green-100 text-green-800">פועל</Badge>;
    }
    
    return <Badge variant="outline" className="bg-red-100 text-red-800">לא פועל</Badge>;
  };

  const getStatusIcon = () => {
    if (!diagnosticInfo) {
      return <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />;
    }
    
    if (diagnosticInfo.status === 'success') {
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    }
    
    return <XCircle className="h-6 w-6 text-red-500" />;
  };

  const testDirectPayment = async () => {
    try {
      toast.info('בודק חיבור למערכת התשלומים...');
      
      const { data, error } = await supabase.functions.invoke('direct-payment', {
        body: { action: 'health-check' }
      });
      
      if (error) {
        console.error('Health check error:', error);
        toast.error(`בדיקת חיבור נכשלה: ${error.message}`);
      } else {
        console.log('Health check result:', data);
        toast.success('חיבור למערכת התשלומים פועל!');
      }
    } catch (error: any) {
      console.error('Health check exception:', error);
      toast.error(`שגיאה בבדיקת חיבור: ${error.message}`);
    }
  };

  const testCardcomPayment = async () => {
    try {
      toast.info('בודק חיבור למערכת קארדקום...');
      
      const { data, error } = await supabase.functions.invoke('cardcom-payment/health-check', {
        body: {}
      });
      
      if (error) {
        console.error('Cardcom health check error:', error);
        toast.error(`בדיקת חיבור קארדקום נכשלה: ${error.message}`);
      } else {
        console.log('Cardcom health check result:', data);
        toast.success('חיבור למערכת קארדקום פועל!');
      }
    } catch (error: any) {
      console.error('Cardcom health check exception:', error);
      toast.error(`שגיאה בבדיקת חיבור קארדקום: ${error.message}`);
    }
  };

  return (
    <Card className="mb-4 border border-amber-200 bg-amber-50">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">אבחון מערכת תשלומים</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          בדיקת סטטוס חיבור למערכת התשלומים
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>
          <div>
            <p className="text-sm font-semibold">
              פונקציית תשלום: {diagnosticInfo?.function || 'לא ידוע'}
            </p>
            <p className="text-xs text-muted-foreground">
              סטטוס: {diagnosticInfo?.status === 'success' ? 'פעיל' : 'לא פעיל'}
            </p>
          </div>
        </div>
        
        {isExpanded && diagnosticInfo && (
          <div className="mt-4 p-2 bg-slate-100 rounded text-xs overflow-auto max-h-40">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(diagnosticInfo, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col gap-2 pt-0">
        <div className="flex gap-2 w-full">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={testDirectPayment}
          >
            בדוק חיבור ישיר
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={testCardcomPayment}
          >
            בדוק חיבור קארדקום
          </Button>
        </div>
        <div className="flex gap-2 w-full">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'הסתר פרטים טכניים' : 'הצג פרטים טכניים'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> רענן
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default PaymentDiagnostics;
