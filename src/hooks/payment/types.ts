
interface PaymentProductInfo {
  Description: string;
  UnitCost: string;
  Quantity?: number;
}

export interface CreateLowProfilePayload {
  TerminalNumber: number;
  ApiName: string;
  Operation: "ChargeOnly" | "CreateTokenOnly" | "ChargeAndCreateToken";
  ReturnValue: string;
  Amount: string;
  SuccessRedirectUrl: string;
  FailedRedirectUrl: string;
  WebHookUrl: string;
  ProductName?: string;
  Language?: string;
  ISOCoinId?: number;
  Document: {
    Name: string;
    Email: string;
    Products: PaymentProductInfo[];
  };
}
