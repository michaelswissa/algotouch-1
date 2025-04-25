
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type RegistrationStep = 'plan_selection' | 'contract' | 'payment' | 'success';

interface RegistrationState {
  id: string | null;
  currentStep: RegistrationStep;
  data: Record<string, any>;
  isValid: boolean;
}

export const useRegistrationState = () => {
  const [state, setState] = useState<RegistrationState>({
    id: null,
    currentStep: 'plan_selection',
    data: {},
    isValid: false
  });
  const navigate = useNavigate();

  // Initialize or restore registration session
  useEffect(() => {
    const initializeRegistration = async () => {
      // Try to get existing registration ID from sessionStorage
      const storedId = sessionStorage.getItem('registration_id');
      
      if (storedId) {
        // Attempt to restore existing registration
        const { data: regData, error } = await supabase
          .from('temp_registration_data')
          .select('*')
          .eq('id', storedId)
          .single();

        if (regData && !error && !regData.used && new Date(regData.expires_at) > new Date()) {
          setState({
            id: storedId,
            currentStep: regData.registration_data.currentStep || 'plan_selection',
            data: regData.registration_data,
            isValid: true
          });
          return;
        }
      }

      // Create new registration record if none exists or previous is invalid
      const { data: newReg, error: createError } = await supabase
        .from('temp_registration_data')
        .insert({
          registration_data: { currentStep: 'plan_selection' },
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
        })
        .select()
        .single();

      if (createError) {
        toast.error('שגיאה באתחול תהליך ההרשמה');
        return;
      }

      sessionStorage.setItem('registration_id', newReg.id);
      setState({
        id: newReg.id,
        currentStep: 'plan_selection',
        data: newReg.registration_data,
        isValid: true
      });
    };

    initializeRegistration();
  }, []);

  const updateRegistrationData = async (newData: Record<string, any>) => {
    if (!state.id) return false;

    try {
      const updatedData = { ...state.data, ...newData };
      const { error } = await supabase
        .from('temp_registration_data')
        .update({ 
          registration_data: updatedData,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        })
        .eq('id', state.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        data: updatedData
      }));

      return true;
    } catch (error) {
      console.error('Error updating registration data:', error);
      toast.error('שגיאה בשמירת הנתונים');
      return false;
    }
  };

  const validateAndProceed = async (nextStep: RegistrationStep) => {
    if (!state.id) return false;

    try {
      // Validate current step server-side
      const { data: isValid } = await supabase
        .rpc('validate_registration_step', {
          registration_id: state.id,
          current_step: state.currentStep
        });

      if (!isValid) {
        toast.error('יש להשלים את כל הפרטים הנדרשים');
        return false;
      }

      // Update step in database and state
      const success = await updateRegistrationData({
        ...state.data,
        currentStep: nextStep
      });

      if (success) {
        setState(prev => ({
          ...prev,
          currentStep: nextStep
        }));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error validating step:', error);
      toast.error('שגיאה באימות הנתונים');
      return false;
    }
  };

  const finalizeRegistration = async () => {
    if (!state.id) return false;
    
    try {
      const { error } = await supabase
        .from('temp_registration_data')
        .update({ used: true })
        .eq('id', state.id);

      if (error) throw error;
      
      // Clear registration data from session
      sessionStorage.removeItem('registration_id');
      return true;
    } catch (error) {
      console.error('Error finalizing registration:', error);
      return false;
    }
  };

  return {
    currentStep: state.currentStep,
    registrationData: state.data,
    isValid: state.isValid,
    updateRegistrationData,
    validateAndProceed,
    finalizeRegistration
  };
};
