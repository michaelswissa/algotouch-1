
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';

export type RegistrationStep = 'plan_selection' | 'contract' | 'payment' | 'success';

export interface RegistrationData {
  id: string | null;
  currentStep: RegistrationStep;
  planId?: string;
  email?: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    [key: string]: any;
  };
  contractSigned?: boolean;
  contractSignedAt?: string;
  contractDetails?: any;
  isValid: boolean;
}

interface RegistrationContextType {
  registrationData: RegistrationData;
  isInitializing: boolean;
  updateRegistrationData: (newData: Partial<Omit<RegistrationData, 'id' | 'isValid'>>) => Promise<boolean>;
  validateAndProceed: (nextStep: RegistrationStep) => Promise<boolean>;
  finalizeRegistration: () => Promise<boolean>;
  clearRegistrationData: () => Promise<void>;
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

export const RegistrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    id: null,
    currentStep: 'plan_selection',
    isValid: false
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const initializeRegistration = async () => {
      try {
        const storedId = sessionStorage.getItem('registration_id');
        
        if (storedId) {
          const { data: regData, error } = await supabase
            .from('temp_registration_data')
            .select('*')
            .eq('id', storedId)
            .single();

          if (regData && !error && !regData.used && new Date(regData.expires_at) > new Date()) {
            setRegistrationData({
              id: storedId,
              currentStep: regData.registration_data.currentStep || 'plan_selection',
              ...regData.registration_data,
              isValid: true
            });
            setIsInitializing(false);
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
          console.error('Error creating registration data:', createError);
          toast.error('שגיאה באתחול תהליך ההרשמה');
          setIsInitializing(false);
          return;
        }

        sessionStorage.setItem('registration_id', newReg.id);
        setRegistrationData({
          id: newReg.id,
          currentStep: 'plan_selection',
          ...newReg.registration_data,
          isValid: true
        });
      } catch (error) {
        console.error('Error in registration initialization:', error);
        toast.error('שגיאה באתחול תהליך ההרשמה');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeRegistration();
  }, []);

  // Auto-fill user data if authenticated
  useEffect(() => {
    if (user && registrationData.id && !registrationData.email) {
      updateRegistrationData({
        email: user.email || '',
        userData: {
          ...registrationData.userData,
          firstName: user.user_metadata?.first_name || '',
          lastName: user.user_metadata?.last_name || '',
          phone: user.user_metadata?.phone || ''
        }
      });
    }
  }, [user, registrationData.id, registrationData.email]);

  const updateRegistrationData = async (newData: Partial<Omit<RegistrationData, 'id' | 'isValid'>>) => {
    if (!registrationData.id) return false;

    try {
      const updatedData = { 
        ...registrationData, 
        ...newData,
        // Preserve metadata fields
        id: registrationData.id,
        isValid: registrationData.isValid 
      };
      
      // Save to database
      const { error } = await supabase
        .from('temp_registration_data')
        .update({ 
          registration_data: {
            ...updatedData,
            id: undefined,
            isValid: undefined
          },
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        })
        .eq('id', registrationData.id);

      if (error) throw error;

      // Update local state
      setRegistrationData(updatedData);
      return true;
    } catch (error) {
      console.error('Error updating registration data:', error);
      toast.error('שגיאה בשמירת הנתונים');
      return false;
    }
  };

  const validateAndProceed = async (nextStep: RegistrationStep) => {
    if (!registrationData.id) return false;

    try {
      // Validate current step server-side
      const { data: isValid, error: validationError } = await supabase
        .rpc('validate_registration_step', {
          registration_id: registrationData.id,
          current_step: registrationData.currentStep
        });

      if (validationError) throw validationError;
      
      if (!isValid) {
        toast.error('יש להשלים את כל הפרטים הנדרשים');
        return false;
      }

      // Update step in database
      const success = await updateRegistrationData({
        currentStep: nextStep
      });

      return success;
    } catch (error) {
      console.error('Error validating step:', error);
      toast.error('שגיאה באימות הנתונים');
      return false;
    }
  };

  const finalizeRegistration = async () => {
    if (!registrationData.id) return false;
    
    try {
      const { error } = await supabase
        .from('temp_registration_data')
        .update({ used: true })
        .eq('id', registrationData.id);

      if (error) throw error;
      
      sessionStorage.removeItem('registration_id');
      return true;
    } catch (error) {
      console.error('Error finalizing registration:', error);
      return false;
    }
  };
  
  const clearRegistrationData = async () => {
    try {
      if (registrationData.id) {
        await supabase
          .from('temp_registration_data')
          .update({ used: true })
          .eq('id', registrationData.id);
      }
      
      sessionStorage.removeItem('registration_id');
      setRegistrationData({
        id: null,
        currentStep: 'plan_selection',
        isValid: false
      });
    } catch (error) {
      console.error('Error clearing registration data:', error);
    }
  };

  return (
    <RegistrationContext.Provider 
      value={{
        registrationData,
        isInitializing,
        updateRegistrationData,
        validateAndProceed,
        finalizeRegistration,
        clearRegistrationData
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  
  if (context === undefined) {
    throw new Error('useRegistration must be used within a RegistrationProvider');
  }
  
  return context;
};
