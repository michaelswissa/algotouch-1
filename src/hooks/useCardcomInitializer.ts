
import { useEffect, useState } from 'react';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

/**
 * Hook for initializing CardCom payment fields using the 3DS.js script
 */
export const useCardcomInitializer = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  
  /**
   * Initialize CardCom payment fields with the loaded 3DS.js script
   * 
   * @param lowProfileCode - Unique code for this payment session
   * @param sessionId - Session ID for tracking
   * @param terminalNumber - CardCom terminal number
   * @param operationType - Type of operation (payment or token_only)
   * @returns Promise resolving to boolean indicating success
   */
  const initializeCardcomFields = async (
    lowProfileCode: string, 
    sessionId: string,
    terminalNumber: string,
    operationType: 'payment' | 'token_only' = 'payment'
  ): Promise<boolean> => {
    // Validate required parameters
    if (!lowProfileCode || !sessionId || !terminalNumber) {
      PaymentLogger.error("Missing required parameters for CardCom initialization:", { 
        hasLowProfileCode: Boolean(lowProfileCode), 
        hasSessionId: Boolean(sessionId),
        hasTerminalNumber: Boolean(terminalNumber)
      });
      return false;
    }
    
    if (!window.cardcom3DS) {
      PaymentLogger.error("CardCom 3DS.js script not loaded");
      return false;
    }
    
    try {
      // Convert operation type to CardCom's expected format
      const operation = operationType === 'token_only' ? '3' : '1'; // 3=CreateTokenOnly, 1=ChargeOnly
      
      PaymentLogger.log('Initializing CardCom fields with:', { 
        lowProfileCode, 
        sessionId,
        terminalNumber,
        operation
      });
      
      // Initialize the CardCom 3DS fields
      window.cardcom3DS.init({
        LowProfileCode: lowProfileCode,
        TerminalNumber: terminalNumber,
        Operation: operation,
        Language: 'he'
      });
      
      // Allow a moment for fields to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsInitialized(true);
      PaymentLogger.log('CardCom fields initialized successfully');
      return true;
    } catch (error) {
      PaymentLogger.error('Error initializing CardCom fields:', error);
      return false;
    }
  };

  // Load script on component mount
  useEffect(() => {
    const scriptId = 'cardcom-3ds-script';
    
    // Check if script is already loaded
    if (document.getElementById(scriptId)) {
      PaymentLogger.log('CardCom 3DS.js script already loaded');
      return;
    }

    PaymentLogger.log('Loading CardCom 3DS.js script');
    
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=${Date.now()}`;
    script.async = true;
    
    script.onload = () => {
      PaymentLogger.log('CardCom 3DS.js script loaded successfully');
    };
    
    script.onerror = () => {
      PaymentLogger.error('Failed to load CardCom 3DS.js script');
    };

    document.body.appendChild(script);

    // Cleanup function
    return () => {
      // We don't actually remove the script on cleanup as it may be used by other components
    };
  }, []);

  return { 
    initializeCardcomFields, 
    isInitialized 
  };
};
