
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendCancellationConfirmationEmail } from '@/lib/contracts/email-service';

interface CancellationOptions {
  reason?: string;
  feedback?: string;
  userId: string;
  subscriptionId?: string;
  email?: string;
  fullName?: string;
  planType?: string;
}

/**
 * Cancels a user's subscription with proper handling and notifications
 */
export async function cancelSubscription(
  options: CancellationOptions
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('Cancelling subscription:', {
      userId: options.userId,
      reason: options.reason || 'Not specified'
    });
    
    // Call the cancel-subscription edge function
    const { data, error } = await supabase.functions.invoke('cancel-subscription', {
      body: {
        userId: options.userId,
        subscriptionId: options.subscriptionId,
        reason: options.reason,
        feedback: options.feedback
      }
    });
    
    if (error) {
      console.error('Error cancelling subscription:', error);
      return { success: false, error };
    }
    
    // Send cancellation confirmation email
    if (options.email) {
      const planName = options.planType === 'monthly' ? 'חודשי' : 
                      options.planType === 'annual' ? 'שנתי' : 'VIP';
                      
      // Calculate end date (current period end)
      const endDate = new Date();
      if (options.planType === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (options.planType === 'annual') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      
      sendCancellationConfirmationEmail(
        options.email,
        options.fullName || '',
        {
          planId: options.planType || '',
          planName,
          endDate: endDate.toISOString(),
          reason: options.reason
        }
      ).catch(emailError => {
        console.error('Error sending cancellation email:', emailError);
        // Non-critical error, we can continue
      });
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Exception cancelling subscription:', error);
    return { success: false, error };
  }
}

/**
 * Handles subscription downgrade (for when a user wants to switch to a lower plan)
 */
export async function downgradeSubscription(
  userId: string,
  currentPlanType: string,
  targetPlanType: string,
  email?: string,
  fullName?: string
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('Downgrading subscription:', {
      userId,
      fromPlan: currentPlanType,
      toPlan: targetPlanType
    });
    
    // This would typically be implemented with a specific API call
    // For now, we simulate the behavior
    const success = true;
    
    if (success && email) {
      // Send email notification about plan change
      const planName = targetPlanType === 'monthly' ? 'חודשי' : 
                      targetPlanType === 'annual' ? 'שנתי' : 'VIP';
                      
      // Calculate when the new plan takes effect (typically at the end of current billing period)
      const effectiveDate = new Date();
      if (currentPlanType === 'monthly') {
        effectiveDate.setMonth(effectiveDate.getMonth() + 1);
      } else if (currentPlanType === 'annual') {
        effectiveDate.setFullYear(effectiveDate.getFullYear() + 1);
      }
      
      // Non-blocking email sending
      sendCancellationConfirmationEmail(
        email,
        fullName || '',
        {
          planId: targetPlanType,
          planName,
          endDate: effectiveDate.toISOString(),
          reason: 'Downgrade to lower plan'
        }
      ).catch(emailError => {
        console.error('Error sending plan change email:', emailError);
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Exception downgrading subscription:', error);
    return { success: false, error };
  }
}

/**
 * Creates a reminder for upcoming subscription renewal
 */
export async function createRenewalReminder(
  userId: string,
  email: string,
  renewalDate: string,
  planType: string
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('Creating renewal reminder:', {
      userId,
      email,
      renewalDate,
      planType
    });
    
    // This would typically schedule a notification in the system
    // For now, we simulate success
    
    return { success: true };
  } catch (error) {
    console.error('Exception creating renewal reminder:', error);
    return { success: false, error };
  }
}
