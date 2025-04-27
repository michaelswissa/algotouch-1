
export const CARDCOM_CONFIG = {
  terminalNumber: '160138',
  apiName: 'bLaocQRMSnwphQRUVG3b',
  endpoints: {
    createLowProfile: 'https://secure.cardcom.solutions/api/v11/LowProfile/Create',
    tokenize: 'https://secure.cardcom.solutions/api/v11/Tokens/TokenizeCard',
    charge: 'https://secure.cardcom.solutions/api/v11/Transactions/ChargeToken'
  },
  validateOptions: {
    simpleValidation: 2, // J2 - Simple card validation
    authorization: 5      // J5 - Authorization with hold
  }
};
