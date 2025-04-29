
/**
 * Type definitions for CardCom 3DS.js
 */

declare global {
  interface Window {
    cardcom3DS: {
      /**
       * Initialize the CardCom 3DS payment fields
       * @param options Configuration options for CardCom 3DS
       */
      init: (options: CardCom3DSInitOptions) => void;
      
      /**
       * Validate the payment form fields
       * @returns Boolean indicating if all fields are valid
       */
      validateFields: () => boolean;
      
      /**
       * Process the payment with the given low profile code
       * @param lowProfileCode The unique code for the payment session
       */
      doPayment: (lowProfileCode: string) => void;
    };
  }
}

interface CardCom3DSInitOptions {
  /**
   * The unique code for the payment session
   */
  lowProfileCode: string;
  
  /**
   * The terminal number for the payment gateway
   */
  terminalNumber: string;
  
  /**
   * The language for the payment form
   */
  language: string;
  
  /**
   * The operation type: 
   * - "1" for ChargeOnly
   * - "2" for ChargeAndCreateToken
   * - "3" for CreateTokenOnly
   */
  operation: string;
}

export {};
