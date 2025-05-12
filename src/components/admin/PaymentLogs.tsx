import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaymentDebugger } from '@/services/debugging/paymentDebugger';
import { toast } from 'sonner';
import { PaymentLog, PaymentLogDB } from '@/types/payment-logs';

interface PaymentLog {
  id: string;
  level: string;
  message: string;
  context: string;
  payment_data: any;
  user_id: string;
  transaction_id: string;
  created_at: string;
}

export default function PaymentLogs() {
  const [recentLogs, setRecentLogs] = useState<PaymentLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<PaymentLog[]>([]);
  const [successLogs, setSuccessLogs] = useState<PaymentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [transactionFlow, setTransactionFlow] = useState<PaymentLog[]>([]);
  const [errorPatterns, setErrorPatterns] = useState<any[]>([]);

  // Fetch logs on component mount
  useEffect(() => {
    fetchLogs();
    analyzeErrors();
  }, []);

  // Fetch recent logs from the database
  const fetchLogs = async () => {
    setIsLoading(true);
    
    try {
      // Fetch recent logs
      const { data: recent, error: recentError } = await supabase
        .from('payment_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (recentError) throw recentError;
      // Map database logs to UI format
      setRecentLogs(recent ? recent.map(mapDbLogToUiLog) : []);
      
      // Fetch error logs
      const { data: errors, error: errorLogsError } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('payment_status', 'error')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (errorLogsError) throw errorLogsError;
      setErrorLogs(errors ? errors.map(mapDbLogToUiLog) : []);
      
      // Fetch success logs
      const { data: successes, error: successLogsError } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('payment_status', 'success')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (successLogsError) throw successLogsError;
      setSuccessLogs(successes ? successes.map(mapDbLogToUiLog) : []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('אירעה שגיאה בטעינת הלוגים');
    } finally {
      setIsLoading(false);
    }
  };

  // Map database log to UI log format
  const mapDbLogToUiLog = (dbLog: any): PaymentLog => {
    const paymentData = dbLog.payment_data || {};
    
    return {
      id: dbLog.id,
      level: paymentData.level || dbLog.payment_status || 'info',
      message: paymentData.message || 'Payment log entry',
      context: paymentData.context || 'payment-system',
      payment_data: paymentData.details || paymentData,
      user_id: dbLog.user_id,
      transaction_id: dbLog.transaction_id,
      created_at: dbLog.created_at,
      session_id: paymentData.session_id,
      source: paymentData.source || 'system'
    };
  };

  // Analyze error patterns
  const analyzeErrors = async () => {
    try {
      const patterns = await PaymentDebugger.analyzeErrors();
      setErrorPatterns(patterns);
    } catch (error) {
      console.error('Error analyzing errors:', error);
    }
  };

  // Get transaction flow
  const getTransactionFlow = async () => {
    if (!transactionId) {
      toast.warning('יש להזין מזהה עסקה');
      return;
    }
    
    try {
      setIsLoading(true);
      const flow = await PaymentDebugger.getTransactionFlow(transactionId);
      setTransactionFlow(flow);
      
      if (flow.length === 0) {
        toast.info('לא נמצאו רשומות עבור מזהה העסקה הזה');
      }
    } catch (error) {
      console.error('Error fetching transaction flow:', error);
      toast.error('אירעה שגיאה בטעינת נתוני העסקה');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter logs based on search term
  const filteredLogs = (logs: PaymentLog[]) => {
    if (!searchTerm) return logs;
    
    return logs.filter(log => 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.context.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.payment_data).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Render log level badge with corrected variants
  const renderLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive">{level}</Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-orange-500 text-white">{level}</Badge>;
      case 'success':
        return <Badge variant="outline" className="bg-green-500 text-white">{level}</Badge>;
      case 'info':
        return <Badge variant="secondary">{level}</Badge>;
      default:
        return <Badge variant="default">{level}</Badge>;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('he-IL', {
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(date);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>לוגים של תשלומים</CardTitle>
        <CardDescription>מעקב אחר תשלומים ואיתור תקלות</CardDescription>

        <div className="flex flex-col gap-2 mt-4">
          <Input
            placeholder="חיפוש בלוגים..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-2"
          />
          
          <div className="flex gap-2">
            <Input
              placeholder="הזן מזהה עסקה לניתוח..."
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />
            <Button onClick={getTransactionFlow}>נתח עסקה</Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="recent">
          <TabsList className="mb-4">
            <TabsTrigger value="recent">אחרונים</TabsTrigger>
            <TabsTrigger value="errors">שגיאות</TabsTrigger>
            <TabsTrigger value="success">הצלחות</TabsTrigger>
            <TabsTrigger value="flow">ניתוח עסקה</TabsTrigger>
            <TabsTrigger value="patterns">דפוסי שגיאות</TabsTrigger>
          </TabsList>

          <TabsContent value="recent">
            <div className="rounded-md border max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>זמן</TableHead>
                    <TableHead>רמה</TableHead>
                    <TableHead>הודעה</TableHead>
                    <TableHead>הקשר</TableHead>
                    <TableHead>מזהה עסקה</TableHead>
                    <TableHead>מזהה משתמש</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">טוען...</TableCell>
                    </TableRow>
                  ) : filteredLogs(recentLogs).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">לא נמצאו לוגים</TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs(recentLogs).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDate(log.created_at)}</TableCell>
                        <TableCell>{renderLevelBadge(log.level)}</TableCell>
                        <TableCell>{log.message}</TableCell>
                        <TableCell>{log.context}</TableCell>
                        <TableCell>{log.transaction_id}</TableCell>
                        <TableCell>{log.user_id}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="errors">
            <div className="rounded-md border max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>זמן</TableHead>
                    <TableHead>הודעה</TableHead>
                    <TableHead>הקשר</TableHead>
                    <TableHead>מזהה עסקה</TableHead>
                    <TableHead>פרטי שגיאה</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">טוען...</TableCell>
                    </TableRow>
                  ) : filteredLogs(errorLogs).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">לא נמצאו שגיאות</TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs(errorLogs).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDate(log.created_at)}</TableCell>
                        <TableCell>{log.message}</TableCell>
                        <TableCell>{log.context}</TableCell>
                        <TableCell>{log.transaction_id}</TableCell>
                        <TableCell>
                          {log.payment_data?.error ? (
                            <pre className="text-xs overflow-auto max-w-xs">
                              {typeof log.payment_data.error === 'object' 
                                ? JSON.stringify(log.payment_data.error, null, 2) 
                                : log.payment_data.error}
                            </pre>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="success">
            <div className="rounded-md border max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>זמן</TableHead>
                    <TableHead>הודעה</TableHead>
                    <TableHead>מזהה עסקה</TableHead>
                    <TableHead>מזהה משתמש</TableHead>
                    <TableHead>סכום</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">טוען...</TableCell>
                    </TableRow>
                  ) : filteredLogs(successLogs).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">לא נמצאו תשלומים מוצלחים</TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs(successLogs).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDate(log.created_at)}</TableCell>
                        <TableCell>{log.message}</TableCell>
                        <TableCell>{log.transaction_id}</TableCell>
                        <TableCell>{log.user_id}</TableCell>
                        <TableCell>
                          {log.payment_data?.amount ? `${log.payment_data.amount} ₪` : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="flow">
            <div className="rounded-md border max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>זמן</TableHead>
                    <TableHead>רמה</TableHead>
                    <TableHead>הודעה</TableHead>
                    <TableHead>הקשר</TableHead>
                    <TableHead>נתונים</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">טוען...</TableCell>
                    </TableRow>
                  ) : transactionFlow.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        {transactionId 
                          ? 'לא נמצאו נתונים עבור עסקה זו' 
                          : 'הזן מזהה עסקה כדי לראות את רצף האירועים'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactionFlow.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDate(log.created_at)}</TableCell>
                        <TableCell>{renderLevelBadge(log.level)}</TableCell>
                        <TableCell>{log.message}</TableCell>
                        <TableCell>{log.context}</TableCell>
                        <TableCell>
                          <pre className="text-xs overflow-auto max-w-xs">
                            {JSON.stringify(log.payment_data, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="patterns">
            <div className="rounded-md border max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>הודעת שגיאה</TableHead>
                    <TableHead>כמות מקרים</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center">טוען...</TableCell>
                    </TableRow>
                  ) : errorPatterns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center">לא נמצאו דפוסי שגיאות</TableCell>
                    </TableRow>
                  ) : (
                    errorPatterns.map((pattern, index) => (
                      <TableRow key={index}>
                        <TableCell>{pattern.message}</TableCell>
                        <TableCell>{pattern.count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={fetchLogs}>רענן נתונים</Button>
        <Button variant="outline" onClick={() => setSearchTerm('')}>נקה חיפוש</Button>
      </CardFooter>
    </Card>
  );
}
