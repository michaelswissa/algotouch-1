import { createClient } from '@supabase/supabase-js';
import { PaymentStatusType, PaymentStatus, PaymentSessionData, CardOwnerDetails } from '@/types/payment';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export class PaymentService {
  /**
   * Updates the payment status in the database.
   *
   * @param {string} lowProfileCode - The unique identifier for the payment session.
   * @param {PaymentStatusType} status - The new status to set for the payment.
   * @returns {Promise<boolean>} - A promise that resolves to true if the update was successful, false otherwise.
   */
  static async updatePaymentStatus(lowProfileCode: string, status: PaymentStatusType): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('payment_sessions')
        .update({ payment_status: status })
        .eq('low_profile_id', lowProfileCode);

      if (error) {
        console.error('Error updating payment status:', error);
        return false;
      }

      console.log(`Payment status updated to ${status} for lowProfileCode: ${lowProfileCode}`);
      return true;
    } catch (error) {
      console.error('Error updating payment status:', error);
      return false;
    }
  }

  /**
   * Fetches payment session data from the database by session ID.
   *
   * @param {string} sessionId - The session ID to search for.
   * @returns {Promise<PaymentSessionData | null>} - A promise that resolves to the payment session data if found, null otherwise.
   */
  static async getPaymentSessionData(sessionId: string): Promise<PaymentSessionData | null> {
    try {
      const { data, error } = await supabase
        .from('payment_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) {
        console.error('Error fetching payment session data:', error);
        return null;
      }

      return data ? data as PaymentSessionData : null;
    } catch (error) {
      console.error('Error fetching payment session data:', error);
      return null;
    }
  }

  /**
   * Creates a new payment session in the database.
   *
   * @param {PaymentSessionData} sessionData - The data for the new payment session.
   * @returns {Promise<boolean>} - A promise that resolves to true if the creation was successful, false otherwise.
   */
  static async createPaymentSession(sessionData: PaymentSessionData): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('payment_sessions')
        .insert([
          {
            low_profile_id: sessionData.lowProfileId,
            session_id: sessionData.sessionId,
            terminal_number: sessionData.terminalNumber,
            cardcom_url: sessionData.cardcomUrl,
            reference: sessionData.reference,
            payment_status: PaymentStatus.INITIALIZING,
          },
        ]);

      if (error) {
        console.error('Error creating payment session:', error);
        return false;
      }

      console.log('Payment session created successfully:', sessionData);
      return true;
    } catch (error) {
      console.error('Error creating payment session:', error);
      return false;
    }
  }

  /**
   * Updates the URL in the payment session data in the database.
   *
   * @param {string} sessionId - The session ID of the payment session to update.
   * @param {string} url - The new URL to set for the payment session.
   * @returns {Promise<boolean>} - A promise that resolves to true if the update was successful, false otherwise.
   */
  static async updatePaymentSessionUrl(sessionId: string, url: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('payment_sessions')
        .update({ url: url })
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error updating payment session URL:', error);
        return false;
      }

      console.log(`Payment session URL updated for sessionId: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Error updating payment session URL:', error);
      return false;
    }
  }
}
