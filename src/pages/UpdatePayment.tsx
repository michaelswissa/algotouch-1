
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PaymentCardForm from '@/components/payment/PaymentCardForm';
import { clearFailedPaymentStatus } from '@/lib/subscription/verification-service';
import { useEnhancedSubscription } from '@/contexts/subscription/EnhancedSubscriptionContext';
import { supabase } from '@/integrations/supabase/client';

const UpdatePayment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshStatus } = useEnhancedSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handlePaymentUpdate = async (e: React.FormEvent, cardData: {
    cardNumber: string;
    cardholderName: string;
    expiryDate: string;
    cvv: string;
  }) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('משתמש לא מחובר');
      navigate('/auth');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Get current subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!subscription) {
        toast.error('לא נמצא מנוי');
        navigate('/subscription');
        return;
      }
      
      // Create payment token using the payment service
      const tokenData = {
        token: `updated_${Date.now()}`,
        lastFourDigits: cardData.cardNumber.replace(/\s/g, '').slice(-4),
        expiryMonth: cardData.expiryDate.split('/')[0],
        expiryYear: `20${cardData.expiryDate.split('/')[1]}`,
        cardholderName: cardData.cardholderName
      };
      
      // Update payment method in subscription
      await supabase
        .from('subscriptions')
        .update({
          payment_method: tokenData,
        })
        .eq('id', subscription.id);
      
      // Clear any failed payment status
      await clearFailedPaymentStatus(subscription.id);
      
      // Record a successful payment
      await supabase
        .from('payment_history')
        .insert({
          user_id: user.id,
          subscription_id: subscription.id,
          amount: 0, // Use 0 as a numeric value for token update only
          status: 'completed',
          payment_method: tokenData,
          currency: 'ILS'
        });
      
      toast.success('פרטי התשלום עודכנו בהצלחה');
      
      // Refresh subscription status
      await refreshStatus();
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('שגיאה בעדכון פרטי התשלום');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Layout className="py-8">
      <Card className="max-w-2xl mx-auto shadow-lg" dir="rtl">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent pb-6 border-b">
          <CardTitle className="text-2xl">עדכון פרטי תשלום</CardTitle>
          <CardDescription className="text-base">
            עדכן את פרטי התשלום שלך כדי להמשיך ליהנות מהשירות
          </CardDescription>
        </CardHeader>
        
        <PaymentCardForm
          plan={{ name: 'עדכון פרטי תשלום', price: '', description: '' }}
          isProcessing={isProcessing}
          onSubmit={handlePaymentUpdate}
          buttonText="עדכן פרטי תשלום"
        />
        
        <CardFooter className="flex justify-center border-t p-4">
          <Button
            variant="outline"
            onClick={() => navigate('/my-subscription')}
          >
            חזור לפרטי המנוי
          </Button>
        </CardFooter>
      </Card>
    </Layout>
  );
};

export default UpdatePayment;
