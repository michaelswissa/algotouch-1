
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

