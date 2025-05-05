
/**
 * CardCom payment gateway configuration for production
 */

const config = {
  // Production terminal credentials
  terminalNumber: "160138",
  apiName: "bLaocQRMSnwphQRUVG3b",
  apiPassword: "i9nr6caGbgheTdYfQbo6",
  
  // CardCom API endpoints
  endpoints: {
    base: "https://secure.cardcom.solutions",
    createLowProfile: "https://secure.cardcom.solutions/api/v11/LowProfile/Create",
    getLowProfileResult: "https://secure.cardcom.solutions/api/v11/LowProfile/GetLowProfileResult",
    doTransaction: "https://secure.cardcom.solutions/api/v11/Transaction/DoTransaction"
  },
  
  // Default UI configuration
  ui: {
    language: "he"
  }
};

export default config;
