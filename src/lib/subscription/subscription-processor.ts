
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addMonths, parseISO, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';

export interface SubscriptionDetails {
  planName: string;
  planPrice: string;
  statusText: string;
  nextBillingDate: string;
  progressValue: number;
  daysLeft: number;
  paymentMethod: {
    lastFourDigits: string;
    expiryMonth: string;
    expiryYear: string;
  } | null;
  isExpired: boolean;
  contractSigned: boolean;
}

export interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  next_charge_date: string | null;
  payment_method: {
    lastFourDigits: string;
    expiryMonth: string;
    expiryYear: string;
  } | null;
  contract_signed: boolean;
  contract_signed_at: string | null;
}

export class SubscriptionProcessor {
  static async fetchSubscription(userId: string): Promise<Subscription | null> {
    if (!userId) {
      console.error("Missing userId for subscription fetch");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription:", error);
        return null;
      }

      return data as Subscription;
    } catch (error) {
      console.error("Exception fetching subscription:", error);
      return null;
    }
  }

  static getSubscriptionDetails(sub: Subscription | null, isExpired: boolean): SubscriptionDetails | null {
    if (!sub) return null;

    const planName = sub.plan_type === 'annual' ? 'שנתי' : 
                    sub.plan_type === 'vip' ? 'VIP' : 'חודשי';
    
    let planPrice = '';
    if (sub.plan_type === 'monthly') {
      planPrice = '371';
    } else if (sub.plan_type === 'annual') {
      planPrice = '3,371';
    } else if (sub.plan_type === 'vip') {
      planPrice = '13,121';
    }
    
    let statusText = '';
    let nextBillingDate = '';
    let progressValue = 0;
    let daysLeft = 0;
    
    if (sub.status === 'trial' && sub.trial_ends_at) {
      const trialEndDate = parseISO(sub.trial_ends_at);
      daysLeft = Math.max(0, differenceInDays(trialEndDate, new Date()));
      progressValue = Math.max(0, Math.min(100, (30 - daysLeft) / 30 * 100));
      
      statusText = isExpired ? 'תקופת הניסיון הסתיימה' : 'בתקופת ניסיון';
      nextBillingDate = format(trialEndDate, 'dd/MM/yyyy', { locale: he });
    } else if (sub.status === 'expired') {
      statusText = 'פג תוקף';
      nextBillingDate = 'המנוי הסתיים';
      progressValue = 100;
      daysLeft = 0;
    } else if (sub.next_charge_date) {
      const nextChargeDate = parseISO(sub.next_charge_date);
      nextBillingDate = format(nextChargeDate, 'dd/MM/yyyy', { locale: he });
      
      if (sub.status === 'active') {
        statusText = isExpired ? 'פג תוקף' : 'פעיל';
        
        const endDate = sub.current_period_ends_at 
          ? parseISO(sub.current_period_ends_at) 
          : nextChargeDate;
          
        const startDate = sub.plan_type === 'monthly' 
          ? addMonths(endDate, -1) 
          : addMonths(endDate, -12);
          
        daysLeft = Math.max(0, differenceInDays(endDate, new Date()));
        const totalDays = differenceInDays(endDate, startDate);
        progressValue = Math.max(0, Math.min(100, (totalDays - daysLeft) / totalDays * 100));
      } else if (sub.status === 'cancelled') {
        statusText = 'מבוטל';
        if (sub.current_period_ends_at) {
          const endDate = parseISO(sub.current_period_ends_at);
          daysLeft = Math.max(0, differenceInDays(endDate, new Date()));
        }
      }
    } else if (sub.status === 'active' && sub.plan_type === 'vip') {
      statusText = 'פעיל לכל החיים';
      nextBillingDate = 'ללא חיוב נוסף';
    }
    
    let paymentMethodDetails = null;
    if (sub.payment_method) {
      const paymentMethod = sub.payment_method as any;
      if (paymentMethod.lastFourDigits) {
        paymentMethodDetails = {
          lastFourDigits: paymentMethod.lastFourDigits,
          expiryMonth: paymentMethod.expiryMonth,
          expiryYear: paymentMethod.expiryYear
        };
      }
    }
    
    return {
      planName,
      planPrice,
      statusText,
      nextBillingDate,
      progressValue,
      daysLeft,
      paymentMethod: paymentMethodDetails,
      isExpired,
      contractSigned: sub.contract_signed || false
    };
  }
}
