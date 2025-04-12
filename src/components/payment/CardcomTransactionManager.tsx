
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; 
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TransactionManagerProps {
  onClose?: () => void;
}

interface Transaction {
  InternalDealNumber: number;
  CreateDate: string;
  Amount: number;
  ApprovalNumber: string;
  CardOwnerName?: string;
  Last4CardDigitsString?: string;
  Status1?: number;
  Description?: string;
}

const CardcomTransactionManager: React.FC<TransactionManagerProps> = ({ onClose }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [lowProfileId, setLowProfileId] = useState<string>('');
  const [refundProcessing, setRefundProcessing] = useState<boolean>(false);
  const [cleanupProcessing, setCleanupProcessing] = useState<boolean>(false);

  // Format date as DDMMYYYY
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}${month}${year}`;
  };

  // Get default date range (last 3 days to today)
  const getDefaultDateRange = () => {
    const today = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(today.getDate() - 3);
    
    return {
      from: formatDate(threeDaysAgo.toISOString()),
      to: formatDate(today.toISOString())
    };
  };

  // Load transactions
  const loadTransactions = async () => {
    setLoading(true);
    try {
      const dateRange = getDefaultDateRange();
      const fromDateValue = fromDate || dateRange.from;
      const toDateValue = toDate || dateRange.to;
      
      const { data, error } = await supabase.functions.invoke('cardcom-transaction-manager', {
        body: { 
          action: 'listTransactions',
          params: { 
            fromDate: fromDateValue,
            toDate: toDateValue
          }
        }
      });
      
      if (error) {
        console.error('Error loading transactions:', error);
        toast.error('שגיאה בטעינת עסקאות');
        return;
      }
      
      if (data.ResponseCode === 0 && data.Tranzactions) {
        setTransactions(data.Tranzactions);
        toast.success(`נטענו ${data.Tranzactions.length} עסקאות`);
      } else {
        toast.error('שגיאה בטעינת עסקאות: ' + data.Description);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
      toast.error('שגיאה בטעינת עסקאות');
    } finally {
      setLoading(false);
    }
  };

  // Get transaction by ID
  const getTransactionById = async () => {
    if (!transactionId) {
      toast.error('יש להזין מספר עסקה');
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-transaction-manager', {
        body: { 
          action: 'getTransactionById',
          params: { 
            transactionId
          }
        }
      });
      
      if (error) {
        console.error('Error getting transaction:', error);
        toast.error('שגיאה בטעינת פרטי העסקה');
        return;
      }
      
      if (data && data.length > 0) {
        setSelectedTransaction(data[0]);
        toast.success('נמצאו פרטי העסקה');
      } else {
        toast.error('לא נמצאה עסקה עם המזהה שהוזן');
      }
    } catch (err) {
      console.error('Error getting transaction:', err);
      toast.error('שגיאה בטעינת פרטי העסקה');
    } finally {
      setLoading(false);
    }
  };

  // Process refund
  const processRefund = async () => {
    if (!selectedTransaction) {
      toast.error('יש לבחור עסקה לביטול');
      return;
    }
    
    if (!window.confirm(`האם אתה בטוח שברצונך לבטל את עסקה מספר ${selectedTransaction.InternalDealNumber}?`)) {
      return;
    }
    
    setRefundProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-transaction-manager', {
        body: { 
          action: 'refundTransaction',
          params: { 
            transactionId: selectedTransaction.InternalDealNumber
          }
        }
      });
      
      if (error) {
        console.error('Error processing refund:', error);
        toast.error('שגיאה בביטול העסקה');
        return;
      }
      
      if (data.ResponseCode === 0) {
        toast.success('העסקה בוטלה בהצלחה');
        setSelectedTransaction(null);
      } else {
        toast.error('שגיאה בביטול העסקה: ' + data.Description);
      }
    } catch (err) {
      console.error('Error processing refund:', err);
      toast.error('שגיאה בביטול העסקה');
    } finally {
      setRefundProcessing(false);
    }
  };

  // Clean up payment session
  const cleanupPaymentSession = async () => {
    if (!lowProfileId) {
      toast.error('יש להזין מזהה lowProfileId');
      return;
    }
    
    setCleanupProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-transaction-manager', {
        body: { 
          action: 'cleanupPaymentSession',
          params: { 
            lowProfileId
          }
        }
      });
      
      if (error) {
        console.error('Error cleaning up payment session:', error);
        toast.error('שגיאה בניקוי נתוני התשלום');
        return;
      }
      
      if (data.success) {
        toast.success('נתוני התשלום נוקו בהצלחה');
      } else {
        toast.error('שגיאה בניקוי נתוני התשלום: ' + (data.error || 'שגיאה לא ידועה'));
      }
    } catch (err) {
      console.error('Error cleaning up payment session:', err);
      toast.error('שגיאה בניקוי נתוני התשלום');
    } finally {
      setCleanupProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto" dir="rtl">
      <CardHeader>
        <CardTitle>ניהול עסקאות Cardcom</CardTitle>
        <CardDescription>חיפוש, צפייה וניהול עסקאות מול Cardcom</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">חיפוש לפי תאריכים</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="מתאריך (DDMMYYYY)"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <Input
                  placeholder="עד תאריך (DDMMYYYY)"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
                <Button 
                  onClick={loadTransactions} 
                  disabled={loading}
                  className="whitespace-nowrap"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  חפש עסקאות
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">חיפוש לפי מספר עסקה</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="הזן מספר עסקה"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
                <Button 
                  onClick={getTransactionById}
                  disabled={loading || !transactionId}
                  className="whitespace-nowrap"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  חפש
                </Button>
              </div>
            </div>
          </div>
          
          {transactions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">עסקאות אחרונות</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מס' עסקה</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סכום</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מס' אישור</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.InternalDealNumber} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{transaction.InternalDealNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(transaction.CreateDate).toLocaleDateString('he-IL')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.Amount} ₪</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.ApprovalNumber || 'אין'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTransaction(transaction)}
                          >
                            <Search className="h-4 w-4 mr-1" />
                            פרטים
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {selectedTransaction && (
            <div className="mt-6 border rounded-lg p-4 bg-slate-50">
              <h3 className="text-md font-medium mb-2">פרטי עסקה #{selectedTransaction.InternalDealNumber}</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="font-medium">תאריך:</dt>
                  <dd>{new Date(selectedTransaction.CreateDate).toLocaleDateString('he-IL')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">סכום:</dt>
                  <dd>{selectedTransaction.Amount} ₪</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">מס' אישור:</dt>
                  <dd>{selectedTransaction.ApprovalNumber || 'אין'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">שם בעל הכרטיס:</dt>
                  <dd>{selectedTransaction.CardOwnerName || 'לא זמין'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">4 ספרות אחרונות:</dt>
                  <dd>{selectedTransaction.Last4CardDigitsString || 'לא זמין'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">סטטוס:</dt>
                  <dd>
                    {selectedTransaction.Status1 === 0 ? (
                      <span className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" /> מאושר
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600">
                        <AlertCircle className="h-4 w-4 mr-1" /> {selectedTransaction.Description || 'לא מאושר'}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
              
              <div className="mt-4 flex justify-end">
                <Button
                  variant="destructive"
                  onClick={processRefund}
                  disabled={refundProcessing}
                  className="mr-2"
                >
                  {refundProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  בטל עסקה / החזר כספי
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTransaction(null)}
                >
                  סגור
                </Button>
              </div>
            </div>
          )}
          
          <Separator className="my-4" />
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">ניקוי נתוני תשלום</h3>
            <div className="flex gap-2">
              <Input
                placeholder="הזן lowProfileId"
                value={lowProfileId}
                onChange={(e) => setLowProfileId(e.target.value)}
              />
              <Button 
                onClick={cleanupPaymentSession}
                disabled={cleanupProcessing || !lowProfileId}
                variant="secondary"
                className="whitespace-nowrap"
              >
                {cleanupProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                נקה נתונים
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              פעולה זו תנקה נתוני תשלום מהמערכת לאחר עסקה שהושלמה אך לא עובדה כראוי.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>סגור</Button>
      </CardFooter>
    </Card>
  );
};

export default CardcomTransactionManager;
