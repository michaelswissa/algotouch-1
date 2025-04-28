
export enum PaymentStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export type PaymentStatusType = 
  | PaymentStatus.IDLE
  | PaymentStatus.INITIALIZING
  | PaymentStatus.PROCESSING
  | PaymentStatus.SUCCESS
  | PaymentStatus.FAILED;

export interface PaymentSessionData {
  lowProfileId: string;
  sessionId: string;
  terminalNumber: string;
  cardcomUrl: string;
  reference: string;
  url?: string;
}

export interface CardOwnerDetails {
  cardOwnerName: string;
  cardOwnerId: string;
  cardOwnerEmail: string;
  cardOwnerPhone: string;
  expirationMonth: string;
  expirationYear: string;
}

export interface CardComPaymentResponse {
  success: boolean;
  message?: string;
  data?: {
    transactionId?: string;
    sessionId?: string;
    status?: string;
    [key: string]: any;
  };
}

export interface PaymentError {
  code: string;
  message: string;
}

// Interface for initialization config sent to CardCom iframe
export interface CardComFieldsInitConfig {
  action: 'init';
  lowProfileCode: string;
  LowProfileCode: string; // Duplicate for compatibility
  sessionId: string;
  terminalNumber: string;
  cardFieldCSS: string;
  cvvFieldCSS: string;
  reCaptchaFieldCSS: string;
  placeholder: string;
  cvvPlaceholder: string;
  language: string;
  operation: string;
}

// Interface for transaction request sent to CardCom iframe
export interface CardComTransactionRequest {
  action: 'doTransaction';
  cardOwnerName: string;
  cardOwnerId: string;
  cardOwnerEmail: string;
  cardOwnerPhone: string;
  expirationMonth: string;
  expirationYear: string;
  numberOfPayments: string;
  ExternalUniqTranId: string;
  TerminalNumber: string;
  Operation: string;
  lowProfileCode: string;
  LowProfileCode: string;
  Document?: {
    Name: string;
    Email: string;
    TaxId: string;
    Phone: string;
    DocumentTypeToCreate: string;
  };
}
