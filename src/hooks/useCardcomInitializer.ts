
import { useEffect, useState, useCallback } from 'react';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

/**
 * Hook for initializing CardCom payment fields using the 3DS.js script
 */
export const useCardcomInitializer = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  
  // Load the 3DS.js script once on component mount
  useEffect(() => {
    const loadCardcom3DSScript = () => {
      return new Promise<void>((resolve, reject) => {
        // Check if the script is already available
        if (window.cardcom3DS) {
          PaymentLogger.log('CardCom 3DS script already loaded and available');
          setIsScriptLoaded(true);
          resolve();
          return;
        }

        const scriptId = 'cardcom-3ds-script';
        // Check if the script tag already exists but hasn't loaded yet
        if (document.getElementById(scriptId)) {
          PaymentLogger.log('CardCom 3DS script already loading');
          const existingScript = document.getElementById(scriptId);
          
          existingScript?.addEventListener('load', () => {
            PaymentLogger.log('Existing CardCom 3DS script loaded successfully');
            setIsScriptLoaded(true);
            resolve();
          });
          
          existingScript?.addEventListener('error', () => {
            PaymentLogger.error('Failed to load existing CardCom 3DS script');
            reject(new Error('Failed to load CardCom 3DS script'));
          });
          
          return;
        }

        // Create and append a new script element
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=${Date.now()}`;
        script.async = true;
        
        script.onload = () => {
          PaymentLogger.log('CardCom 3DS script loaded successfully');
          setIsScriptLoaded(true);
          resolve();
        };
        
        script.onerror = () => {
          PaymentLogger.error('Failed to load CardCom 3DS script');
          reject(new Error('Failed to load CardCom 3DS script'));
        };

        document.body.appendChild(script);
      });
    };

    loadCardcom3DSScript().catch((error) => {
      PaymentLogger.error('Error loading CardCom 3DS script:', error);
    });
  }, []); // Empty dependency array ensures this runs only once
  
  /**
   * Initialize CardCom payment fields with the loaded 3DS.js script
   * 
   * @param lowProfileCode - Unique code for this payment session
   * @param sessionId - Session ID for tracking
   * @param terminalNumber - CardCom terminal number
   * @param operationType - Type of operation (payment or token_only)
   * @returns Promise resolving to boolean indicating success
   */
  const initializeCardcomFields = useCallback(async (
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

    // Wait for script to be loaded if it's not yet
    if (!window.cardcom3DS) {
      PaymentLogger.log("Waiting for CardCom 3DS.js script to load...");
      // Try to wait a bit for the script to load
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        if (window.cardcom3DS) break;
      }
      
      if (!window.cardcom3DS) {
        PaymentLogger.error("CardCom 3DS.js script not loaded after waiting");
        return false;
      }
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
      
      // Initialize the CardCom 3DS fields with the proper parameters
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
  }, []);

  return { 
    initializeCardcomFields, 
    isInitialized,
    isScriptLoaded
  };
};
