
/**
 * CardCom Transaction Types
 * Based on the CardCom API documentation
 */

export interface CardOwnerInformation {
  fullName: string;
  identityNumber: string;
  email: string;
  phone: string;
  avsZip?: string;
  avsAddress?: string;
  avsCity?: string;
}

export interface CustomField {
  id: number; // 1-25
  value: string; // max 50 chars
}

export interface DocumentProduct {
  productId?: string;
  description: string;
  quantity?: number;
  unitCost: number;
  totalLineCost?: number;
  isVatFree?: boolean;
  externalId?: string;
}

export interface DocumentAdvancedDefinition {
  isAutoCreateUpdateAccount?: 'auto' | 'true' | 'false';
  accountForeignKey?: string;
  siteUniqueId?: string;
  accountId?: number;
  isLoadInfoFromAccountId?: boolean;
}

export interface DocumentInfo {
  documentType?: string;
  name: string;
  taxId?: string;
  email?: string;
  isSendByEmail?: boolean;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  mobile?: string;
  phone?: string;
  comments?: string;
  isVatFree?: boolean;
  departmentId?: number;
  products?: DocumentProduct[];
  advancedDefinition?: DocumentAdvancedDefinition;
}

export interface TransactionAdvanced {
  apiPassword?: string;
  isRefund?: boolean;
  jValidateType?: number; // 2 or 5
  sapakMutav?: string;
  creditType?: number;
  mti?: number;
  accountIdToGetCardNumber?: number;
  approvalNumber?: string;
  firstPayment?: number;
  constPayment?: number;
  isAutoRecurringPayment?: boolean;
  isCreateToken?: boolean;
  sendNote?: boolean;
}

export interface CardDetails {
  cardNumber: string;
  cvv?: string;
  expirationMMYY: string;
}

export interface DirectTransactionRequest {
  amount: number;
  cardDetails?: CardDetails;
  cardToken?: string;
  cardOwnerInformation?: CardOwnerInformation;
  numOfPayments?: number;
  externalUniqTranId?: string;
  isRefund?: boolean;
  operation?: 'ChargeOnly' | 'ChargeAndCreateToken';
  customFields?: CustomField[];
  currencyCode?: string;
  document?: DocumentInfo;
  advanced?: TransactionAdvanced;
}

export interface CardDetailResponse {
  last4Digits?: string;
  cardType?: string;
  cardBrand?: string;
  cardMonth?: number;
  cardYear?: number;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

export interface PaymentInfoResponse {
  approvalNumber?: string;
  token?: string;
  numberOfPayments?: number;
  firstPaymentAmount?: number;
  constPaymentAmount?: number;
}

export interface DocumentResponse {
  documentNumber?: number;
  documentType?: string;
  documentUrl?: string;
}

export interface TransactionResponse {
  success: boolean;
  responseCode: number;
  description?: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  cardDetails?: CardDetailResponse;
  paymentInfo?: PaymentInfoResponse;
  documentInfo?: DocumentResponse;
  isRefund?: boolean;
  rawResponse?: any;
}
