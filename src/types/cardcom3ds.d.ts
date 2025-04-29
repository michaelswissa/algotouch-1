
// Type definitions for CardCom 3DS.js client

interface CardCom3DSInitOptions {
  LowProfileCode: string;
  TerminalNumber: string;
  Operation?: string;
  Language?: string;
}

interface CardCom3DS {
  /**
   * Initializes the CardCom 3DS payment fields
   */
  init(options: CardCom3DSInitOptions): void;
  
  /**
   * Validates the payment fields (card number, CVV, etc)
   * @returns boolean indicating if all fields are valid
   */
  validateFields(): boolean;
  
  /**
   * Submits the payment with the given lowProfileCode
   * @param lowProfileCode The unique low profile code for this payment session
   */
  doPayment(lowProfileCode: string): void;
}

declare global {
  interface Window {
    /**
     * CardCom 3DS global object for managing payment fields and submission
     */
    cardcom3DS: CardCom3DS;
  }
}
