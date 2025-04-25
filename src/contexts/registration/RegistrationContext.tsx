
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

// Initial state for registration data
const initialRegistrationData: RegistrationData = {
  id: null,
  currentStep: 'plan_selection',
  isValid: false
};

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

export const RegistrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [registrationData, setRegistrationData] = useState<RegistrationData>(initialRegistrationData);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initAttempts, setInitAttempts] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fallback to local storage if Supabase fails
  const saveToLocalStorage = (data: Partial<RegistrationData>) => {
    try {
      const current = JSON.parse(localStorage.getItem('registration_data') || '{}');
      const updated = { ...current, ...data };
      localStorage.setItem('registration_data', JSON.stringify(updated));
      return true;
    } catch (err) {
      console.error('Error saving to localStorage:', err);
      return false;
    }
  };

  // Get data from local storage
  const getFromLocalStorage = (): Partial<RegistrationData> | null => {
    try {
      const data = localStorage.getItem('registration_data');
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('Error getting from localStorage:', err);
      return null;
    }
  };

  useEffect(() => {
    const initializeRegistration = async () => {
      try {
        setIsInitializing(true);
        const storedId = sessionStorage.getItem('registration_id');
        
        if (storedId) {
          try {
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
          } catch (err) {
            console.error('Error fetching registration data:', err);
            // Continue to fallback or create new
          }
        }

        // Try to create new registration record
        try {
          const { data: newReg, error: createError } = await supabase
            .from('temp_registration_data')
            .insert({
              registration_data: { currentStep: 'plan_selection' },
              expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
            })
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          if (newReg) {
            sessionStorage.setItem('registration_id', newReg.id);
            setRegistrationData({
              id: newReg.id,
              currentStep: 'plan_selection',
              ...newReg.registration_data,
              isValid: true
            });
            
            // Also save to localStorage as fallback
            saveToLocalStorage({
              currentStep: 'plan_selection',
              ...newReg.registration_data
            });
          }
        } catch (createErr) {
          console.error('Error creating registration data:', createErr);
          
          // Fallback to localStorage if Supabase fails
          const localData = getFromLocalStorage();
          
          if (localData) {
            setRegistrationData({
              ...initialRegistrationData,
              ...localData,
              isValid: true
            });
            toast.info('המשך תהליך הרשמה מקומי');
          } else {
            // Last resort - use memory only
            setRegistrationData({
              ...initialRegistrationData,
              isValid: true
            });
            toast.error('נתקלנו בבעיה באתחול תהליך הרשמה. אנא רענן את הדף ונסה שוב.');
          }
        }
      } catch (error) {
        console.error('Error in registration initialization:', error);
        
        // If we've tried less than 3 times, try again
        if (initAttempts < 2) {
          setInitAttempts(prev => prev + 1);
          setTimeout(() => {
            initializeRegistration();
          }, 1000); // Wait 1 second before retrying
          return;
        }
        
        toast.error('שגיאה באתחול תהליך ההרשמה');
        
        // Fallback to local state only
        setRegistrationData({
          ...initialRegistrationData,
          isValid: true
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeRegistration();
  }, [initAttempts]);

  // Auto-fill user data if authenticated
  useEffect(() => {
    if (user && registrationData.isValid && !registrationData.email) {
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
  }, [user, registrationData.isValid, registrationData.email]);

  const updateRegistrationData = async (newData: Partial<Omit<RegistrationData, 'id' | 'isValid'>>) => {
    if (!registrationData.isValid) return false;

    try {
      const updatedData = { 
        ...registrationData, 
        ...newData,
        // Preserve metadata fields
        id: registrationData.id,
        isValid: registrationData.isValid 
      };
      
      // Save to localStorage as backup
      saveToLocalStorage(newData);
      
      // Save to database if we have an ID
      if (registrationData.id) {
        try {
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
        } catch (err) {
          console.error('Error updating in Supabase, using local only:', err);
          // Continue with local update even if database fails
        }
      }

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
    if (!registrationData.isValid) return false;

    try {
      let isValid = true;
      
      // If we have a database ID, validate server-side
      if (registrationData.id) {
        try {
          const { data: validationResult, error: validationError } = await supabase
            .rpc('validate_registration_step', {
              registration_id: registrationData.id,
              current_step: registrationData.currentStep
            });

          if (validationError) throw validationError;
          isValid = validationResult === true;
        } catch (err) {
          console.error('Server validation failed, using client validation:', err);
          // Fall back to client-side validation
          isValid = validateStepClient(registrationData.currentStep, registrationData);
        }
      } else {
        // Client-side validation only
        isValid = validateStepClient(registrationData.currentStep, registrationData);
      }
      
      if (!isValid) {
        toast.error('יש להשלים את כל הפרטים הנדרשים');
        return false;
      }

      // Update step in database and local state
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

  const validateStepClient = (step: RegistrationStep, data: RegistrationData): boolean => {
    switch (step) {
      case 'plan_selection':
        return !!data.email && !!data.userData;
      case 'contract':
        return !!data.planId && !!data.email;
      case 'payment':
        return !!data.contractSigned && data.contractSigned === true;
      default:
        return false;
    }
  };

  const finalizeRegistration = async () => {
    if (!registrationData.id && !registrationData.isValid) return false;
    
    try {
      // Mark as used in database if we have an ID
      if (registrationData.id) {
        try {
          const { error } = await supabase
            .from('temp_registration_data')
            .update({ used: true })
            .eq('id', registrationData.id);

          if (error) throw error;
        } catch (err) {
          console.error('Error finalizing in database:', err);
          // Continue even if database update fails
        }
      }
      
      // Clear from session and local storage
      sessionStorage.removeItem('registration_id');
      localStorage.removeItem('registration_data');
      return true;
    } catch (error) {
      console.error('Error finalizing registration:', error);
      return false;
    }
  };
  
  const clearRegistrationData = async () => {
    try {
      if (registrationData.id) {
        try {
          await supabase
            .from('temp_registration_data')
            .update({ used: true })
            .eq('id', registrationData.id);
        } catch (err) {
          console.error('Error marking registration as used:', err);
          // Continue cleanup even if database update fails
        }
      }
      
      sessionStorage.removeItem('registration_id');
      localStorage.removeItem('registration_data');
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
