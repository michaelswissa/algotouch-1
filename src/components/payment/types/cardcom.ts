
export type CardcomOperation = 
  | "ChargeOnly" 
  | "ChargeAndCreateToken" 
  | "CreateTokenOnly" 
  | "SuspendedDeal" 
  | "Do3DSAndSubmit";

export interface UIDefinition {
  IsHideCardOwnerName?: boolean;
  CardOwnerNameValue?: string;
  CardOwnerIdValue?: string;
  IsHideCardOwnerPhone?: boolean;
  CardOwnerPhoneValue?: string;
  IsCardOwnerPhoneRequired?: boolean;
  CardOwnerEmailValue?: string;
  IsHideCardOwnerEmail?: boolean;
  IsCardOwnerEmailRequired?: boolean;
  IsHideCardOwnerIdentityNumber?: boolean;
  IsHideCVV?: boolean;
  CSSUrl?: string;
}

export interface CreateLowProfileRequest {
  TerminalNumber: number;
  ApiName: string;
  Operation: CardcomOperation;
  ReturnValue?: string;
  Amount: number;
  SuccessRedirectUrl: string;
  FailedRedirectUrl: string;
  WebHookUrl: string;
  ProductName?: string;
  Language?: string;
  ISOCoinId?: number;
  UIDefinition?: UIDefinition;
  Document?: {
    DocumentTypeToCreate?: string;
    Name: string;
    Email?: string;
    IsSendByEmail?: boolean;
    Products?: Array<{
      Description: string;
      Quantity?: number;
      UnitCost: number;
      TotalLineCost?: number;
    }>;
  };
}

export interface CardcomResponse {
  ResponseCode: number;
  Description?: string;
  LowProfileId?: string;
  Url?: string;
}

export interface TokenInfo {
  Token: string;
  TokenExDate: string;
  CardYear: number;
  CardMonth: number;
  TokenApprovalNumber: string;
  CardOwnerIdentityNumber?: string;
}

export interface TransactionInfo {
  ResponseCode: number;
  Description?: string;
  TranzactionId: number;
  Amount: number;
  CardMonth: number;
  CardYear: number;
  Token?: string;
  CardOwnerName?: string;
  CardOwnerEmail?: string;
  CardOwnerPhone?: string;
  CardOwnerIdentityNumber?: string;
}

// Add missing CustomField interface
export interface CustomField {
  Id: number;
  Value: string;
}

export interface LowProfileUIValues {
  CardOwnerEmail?: string;
  CardOwnerName?: string;
  CardOwnerPhone?: string;
  CardOwnerIdentityNumber?: string;
  NumOfPayments?: number;
  CardYear?: number;
  CardMonth?: number;
  CustomFields?: Array<CustomField>;
  IsAbroadCard?: boolean;
}

export interface LPUtmData {
  Source?: string;
  Medium?: string;
  Campaign?: string;
  Content?: string;
  Term?: string;
}

// Add missing DocumentInfo interface
export interface DocumentInfo {
  ResponseCode: number;
  Description: string;
  DocumentType: string;
  DocumentNumber: number;
  AccountId: number;
  ForeignAccountNumber?: string;
  SiteUniqueId?: string;
  DocumentUrl?: string;
}

// Add missing SuspendedInfo interface
export interface SuspendedInfo {
  SuspendedDealId: number;
}

export interface GetLowProfileRequest {
  TerminalNumber: number;
  ApiName: string;
  LowProfileId: string;
}

export interface GetLowProfileResult {
  ResponseCode: number;
  Description?: string;
  TerminalNumber: number;
  LowProfileId: string;
  TranzactionId: number;
  ReturnValue?: string;
  Operation?: CardcomOperation;
  UIValues: LowProfileUIValues;
  DocumentInfo?: DocumentInfo;
  TokenInfo?: TokenInfo;
  SuspendedInfo?: SuspendedInfo;
  TranzactionInfo?: TransactionInfo;
  ExternalPaymentVector?: string;
  Country?: string;
  UTM?: LPUtmData;
  IssuerAuthCodeDescription?: string;
}
