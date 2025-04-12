
import React, { useEffect } from 'react';
import Layout from '@/components/Layout';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import CheckPaymentStatus from '@/components/subscription/CheckPaymentStatus';

const PaymentSuccessPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect anonymous users to subscription page
    if (!user) {
      navigate('/subscription', { replace: true });
    }
  }, [user, navigate]);
  
  return (
    <Layout className="py-8" hideSidebar>
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">עיבוד התשלום</h1>
          <p className="text-muted-foreground">מאמת את פרטי התשלום...</p>
        </div>
        
        <CheckPaymentStatus />
      </div>
    </Layout>
  );
};

export default PaymentSuccessPage;
