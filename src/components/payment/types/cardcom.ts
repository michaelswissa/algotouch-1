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

export type DocumentToCreate = 
  | "Auto"
  | "TaxInvoiceAndReceipt"
  | "TaxInvoiceAndReceiptRefund"
  | "Receipt"
  | "ReceiptRefund"
  | "Quote"
  | "Order"
  | "OrderConfirmation"
  | "OrderConfirmationRefund"
  | "DeliveryNote"
  | "DeliveryNoteRefund"
  | "ProformaInvoice"
  | "DemandForPayment"
  | "DemandForPaymentRefund"
  | "TaxInvoice"
  | "TaxInvoiceRefund"
  | "ReceiptForTaxInvoice"
  | "DonationReceipt"
  | "DonationReceiptRefund"
  | "ReceiptForTaxInvoiceRefund";

export type ConfigBool = "auto" | "true" | "false";

export interface CardOwnerInformation {
  Phone?: string;
  FullName?: string;
  IdentityNumber?: string;
  CardOwnerEmail?: string;
  AvsZip?: string;
  AvsAddress?: string;
  AvsCity?: string;
}

export interface AdvancedDocumentDefinition {
  IsAutoCreateUpdateAccount?: ConfigBool;
  AccountForeignKey?: string;
  SiteUniqueId?: string;
  AccountID?: number;
  IsLoadInfoFromAccountID?: boolean;
}

export interface Product {
  ProductID?: string;
  Description: string;
  Quantity?: number;
  UnitCost: number;
  TotalLineCost?: number;
  IsVatFree?: boolean;
  ExternalId?: string;
}

export interface DocumentTran {
  DocumentTypeToCreate?: DocumentToCreate;
  Name: string;
  TaxId?: string;
  Email?: string;
  IsSendByEmail?: boolean;
  AddressLine1?: string;
  AddressLine2?: string;
  City?: string;
  Mobile?: string;
  Phone?: string;
  Comments?: string;
  IsVatFree?: boolean;
  DepartmentId?: number;
  AdvancedDefinition?: AdvancedDocumentDefinition;
  Products?: Product[];
  ManualNumber?: string;
  DocumentDateDDMMYYYY?: string;
  ValueDate?: string;
  Languge?: string;
  IsSendSMS?: boolean;
}

export interface AdvancedTran {
  ApiPassword?: string;
  IsRefund?: boolean;
  ISOCoinName?: string;
  JValidateType?: 2 | 5;
  SapakMutav?: string;
  CreditType?: number;
  MTI?: number;
  AccountIdToGetCardNumber?: number;
  ApprovalNumber?: string;
  FirstPayment?: number;
  ConstPayment?: number;
  IsAutoRecurringPayment?: boolean;
  IsCreateToken?: boolean;
  SendNote?: boolean;
}

export interface TransactionRequest {
  TerminalNumber: number;
  ApiName: string;
  Amount: number;
  CardNumber?: string;
  Token?: string;
  ExternalMerchantId?: string;
  CardExpirationMMYY?: string;
  CVV2?: string;
  ExternalUniqTranId?: string;
  ExternalUniqUniqTranIdResponse?: boolean;
  NumOfPayments?: number;
  CardOwnerInformation?: CardOwnerInformation;
  ISOCoinId?: number;
  CustomFields?: CustomField[];
  Advanced?: AdvancedTran;
  Document?: DocumentTran;
}

export type CardInfo = "Israeli" | "NonIsraeli" | "FuelCard" | "ImmediateChargeCard" | "GiftCard";
export type Brand = "PrivateCard" | "MasterCard" | "Visa" | "Maestro" | "AmericanExpress" | "Isracard" | "JBC" | "Discover" | "Diners";
export type Acquire = "Unknown" | "Isracard" | "CAL" | "Diners" | "AmericanExpress" | "Laumicard" | "CardCom" | "PayPal" | "Upay" | "PayMe";
export type Issuer = "NonIsrael" | "Isracard" | "CAL" | "Diners" | "AmericanExpress" | "JCB" | "Laumicard";
export type PaymentType = "Unknown" | "Standard" | "SpecialCredits" | "ImmediateCharge" | "CreditClub" | "SuperCredit" | "InstallmentCredit" | "Payments" | "ClubPatments";
export type CardNumberEntryMode = "MagneticStip" | "SelfService" | "GasStationSelfService" | "Contactless" | "EmvContactless" | "MobileContactless" | "EmvMobileContactless" | "MobileNumber" | "Emv" | "Phone" | "SignatureOnly" | "Internet" | "Fallback" | "EmptyCandidateList";
export type DealType = "Information" | "Debit" | "Discharge" | "ForcedCharge" | "CashBack" | "CashTransaction" | "Recurring" | "BalanceQuery" | "Cancel" | "Refund" | "Recharge";

export interface TransactionResponse {
  ResponseCode: number;
  Description?: string;
  TranzactionId: number;
  TerminalNumber: number;
  Amount: number;
  CoinId: number;
  CouponNumber?: string;
  CreateDate: string;
  Last4CardDigits: number;
  Last4CardDigitsString?: string;
  FirstCardDigits: number;
  JParameter?: string;
  CardMonth: number;
  CardYear: number;
  ApprovalNumber?: string;
  FirstPaymentAmount: number;
  ConstPaymentAmount: number;
  NumberOfPayments: number;
  CardInfo: CardInfo;
  CardOwnerName?: string;
  CardOwnerPhone?: string;
  CardOwnerEmail?: string;
  CardOwnerIdentityNumber?: string;
  Token?: string;
  CardName?: string;
  SapakMutav?: string;
  Uid?: string;
  ConcentrationNumber?: string;
  DocumentNumber?: number;
  DocumentType?: DocumentToCreate;
  Rrn?: string;
  Brand: Brand;
  Acquire: Acquire;
  Issuer: Issuer;
  PaymentType: PaymentType;
  CardNumberEntryMode: CardNumberEntryMode;
  DealType: DealType;
  IsRefund: boolean;
  DocumentUrl?: string;
  CustomFields?: CustomField[];
  IsAbroadCard: boolean;
  IssuerAuthCodeDescription?: string;
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
