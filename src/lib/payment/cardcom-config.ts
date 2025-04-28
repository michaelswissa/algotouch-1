
/**
 * CardCom payment gateway configuration
 * Central place for CardCom-related configuration values
 */
export const CARDCOM_CONFIG = {
  // Terminal information - using empty strings as defaults
  // Terminal info will be retrieved from environment variables via edge functions
  terminalNumber: "",  // Will be provided by the server
  apiName: "",         // Will be provided by the server
  apiPassword: "",     // Will be provided by the server
  
  // CardCom API endpoints
  endpoints: {
    base: "https://secure.cardcom.solutions",
    master: "https://secure.cardcom.solutions/api/openfields/master",
    cardNumber: "https://secure.cardcom.solutions/api/openfields/cardNumber",
    cvv: "https://secure.cardcom.solutions/api/openfields/CVV",
    reCaptcha: "https://secure.cardcom.solutions/api/openfields/reCaptcha",
    createLowProfile: "https://secure.cardcom.solutions/api/v11/LowProfile/Create",
    getLowProfileResult: "https://secure.cardcom.solutions/api/v11/LowProfile/GetLowProfileResult",
    doTransaction: "https://secure.cardcom.solutions/api/v11/Transaction/DoTransaction"
  },
  
  // Default UI configuration
  ui: {
    language: "he",
    theme: "light",
    cardNumberPlaceholder: "1111-2222-3333-4444",
    cvvPlaceholder: "123"
  },
  
  // CSS styles for payment fields
  styles: {
    cardNumberCSS: `
      body { margin: 0; padding: 0; box-sizing: border-box; direction: ltr; }
      .cardNumberField {
        border: 1px solid #ccc;
        border-radius: 4px;
        height: 40px;
        width: 100%;
        padding: 0 10px;
        font-size: 16px;
        box-sizing: border-box;
      }
      .cardNumberField:focus {
        border-color: #3498db;
        outline: none;
      }
      .cardNumberField.invalid {
        border-color: #e74c3c;
      }`,
    
    cvvCSS: `
      body { margin: 0; padding: 0; box-sizing: border-box; direction: ltr; }
      .cvvField {
        border: 1px solid #ccc;
        border-radius: 3px;
        height: 39px;
        margin: 0;
        padding: 0 10px;
        width: 100%;
        box-sizing: border-box;
      }
      .cvvField:focus {
        border-color: #3498db;
        outline: none;
      }
      .cvvField.invalid {
        border-color: #e74c3c;
      }`,
      
    reCaptchaCSS: 'body { margin: 0; padding:0; display: flex; justify-content: center; }'
  }
};

/**
 * Get the full URL for a CardCom API endpoint
 */
export function getCardcomUrl(path: string): string {
  return `${CARDCOM_CONFIG.endpoints.base}${path}`;
}

/**
 * Get the master iframe URL with terminal number
 */
export function getMasterFrameUrl(terminalNumber: string = CARDCOM_CONFIG.terminalNumber): string {
  return `${CARDCOM_CONFIG.endpoints.master}?terminalNumber=${terminalNumber}`;
}

/**
 * Get error message from CardCom response code
 */
export function getCardcomErrorMessage(responseCode: number | string): string {
  const code = typeof responseCode === 'string' ? parseInt(responseCode, 10) : responseCode;
  
  switch (code) {
    case 0:
      return 'העסקה בוצעה בהצלחה';
    case 1:
      return 'מספר כרטיס לא תקין';
    case 2:
      return 'כרטיס סירב לעסקה';
    case 3:
      return 'בעיה בתוקף הכרטיס';
    case 4:
      return 'עבר מגבלת תשלומים';
    case 5:
      return 'שגיאה בפרטי העסקה';
    case 6:
      return 'שגיאת מערכת כללית';
    default:
      return 'שגיאה לא ידועה';
  }
}
