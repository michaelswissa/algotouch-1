
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useSubscription } from '@/hooks/useSubscription';

const UpdatePayment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscription, details, loading } = useSubscription();
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pre-fill cardholder name if available
    if (user) {
      supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
            if (fullName) setCardholderName(fullName);
          }
        });
    }
  }, [user]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format card number with spaces
    let value = e.target.value.replace(/\D/g, '');
    if (value) {
      value = value.match(/.{1,4}/g)?.join(' ') || value;
      value = value.substring(0, 19); // 16 digits + 3 spaces
    }
    setCardNumber(value);
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length > 0) {
      // First digit can only be 0 or 1
      if (value.length === 1 && parseInt(value) > 1) {
        value = '0' + value;
      }
      
      // Second digit for months can't be > 2 if first digit is 1
      if (value.length === 2 && value[0] === '1' && parseInt(value[1]) > 2) {
        value = '1' + '2';
      }
      
      // Format MM/YY
      if (value.length > 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
      }
      
      value = value.substring(0, 5); // MM/YY format (5 chars)
    }
    
    setExpiryDate(value);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCvv(value.substring(0, 3));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardNumber || !cardholderName || !expiryDate || !cvv) {
      setError('נא למלא את כל השדות הנדרשים');
      return;
    }

    if (!user?.id) {
      setError('לא זוהה משתמש מחובר');
      return;
    }
    
    setProcessingPayment(true);
    setError(null);
    
    try {
      // Create payment method token
      const tokenData = {
        lastFourDigits: cardNumber.replace(/\s/g, '').slice(-4),
        expiryMonth: expiryDate.split('/')[0],
        expiryYear: `20${expiryDate.split('/')[1]}`,
        cardholderName,
        updatedAt: new Date().toISOString()
      };
      
      // Record payment history
      await supabase.from('payment_history').insert({
        user_id: user.id,
        subscription_id: subscription?.id || user.id,
        amount: 0, // Convert string to number here (0 for update payment method)
        currency: 'USD',
        status: 'payment_method_updated',
        payment_method: tokenData
      });
      
      // Update subscription with new payment method
      await supabase
        .from('subscriptions')
        .update({ 
          payment_method: tokenData,
          status: subscription?.status === 'failed' ? 'active' : subscription?.status
        })
        .eq('user_id', user.id);
      
      toast.success('פרטי התשלום עודכנו בהצלחה');
      navigate('/my-subscription');
    } catch (error: any) {
      console.error('Error updating payment details:', error);
      setError(error.message || 'אירעה שגיאה בעדכון פרטי התשלום');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <Layout className="py-8">
        <div className="max-w-xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>טוען...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout className="py-8">
      <div className="max-w-xl mx-auto">
        <Card className="border-2 border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent pb-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>עדכון פרטי תשלום</CardTitle>
            </div>
            <CardDescription>
              הזן את פרטי כרטיס האשראי החדש שלך
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cardNumber">מספר כרטיס</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cardholderName">שם בעל הכרטיס</Label>
                  <Input
                    id="cardholderName"
                    placeholder="שם מלא כפי שמופיע על הכרטיס"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="expiryDate">תוקף</Label>
                    <Input
                      id="expiryDate"
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChange={handleExpiryDateChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cvv">קוד אבטחה (CVV)</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      type="password"
                      value={cvv}
                      onChange={handleCvvChange}
                    />
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <Separator />
              
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-primary/5 p-2 rounded-md">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>פרטי האשראי שלך מוצפנים ומאובטחים</span>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button
                type="submit"
                className="w-full"
                disabled={processingPayment}
              >
                {processingPayment ? 'מעדכן פרטי תשלום...' : 'עדכן פרטי תשלום'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/my-subscription')}
              >
                ביטול
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default UpdatePayment;
