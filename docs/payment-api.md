
# Payment API Documentation

This document outlines the types, schemas, and modules used in our payment processing system.

## Types

### TokenData

Represents a tokenized credit card for secure payment processing.

```typescript
export type TokenData = {
  token: string;               // Secure token representing the card (from payment processor)
  cardLast4: string;           // Last four digits of the credit card
  expMonth: number;            // Card expiry month (1-12)
  expYear: number;             // Card expiry year (4 digits)
};
```

### SubscriptionPlan

Represents a subscription plan that users can purchase.

```typescript
export type SubscriptionPlan = {
  id: string;                  // Unique identifier
  name: string;                // Display name
  price: number;               // Price in cents/agorot
  interval: "monthly" | "yearly"; // Billing frequency
  description?: string;        // Plan description
};
```

### PaymentError

Represents an error that occurred during payment processing.

```typescript
export type PaymentError = {
  code: string;                // Error code
  message: string;             // User-friendly error message
  raw?: any;                   // Raw error data
};
```

### PaymentSessionData

Represents a saved payment session for recovery.

```typescript
export type PaymentSessionData = {
  userId: string;              // User ID
  planId: string;              // Selected plan ID
  tokenData: TokenData;        // Payment token data
  amount: number;              // Payment amount
  status: "pending" | "approved" | "failed"; // Session status
  createdAt: string;           // Session creation timestamp
};
```

### CardcomChargeResponse

Represents a response from the Cardcom payment gateway.

```typescript
export type CardcomChargeResponse = {
  IsApproved: "1" | "0";       // Success (1) or failure (0)
  ReturnValue: number;         // Return code
  Message: string;             // Response message
  TokenApprovalNumber?: string; // Approval number for successful charges
};
```

### UserSubscription

Represents a user's subscription in the database.

```typescript
export type UserSubscription = {
  user_id: string;             // User ID (foreign key)
  plan_id: string;             // Plan ID
  status: "active" | "suspended" | "cancelled"; // Subscription status
  renewed_at: string;          // Last renewal date
  created_at: string;          // Creation date
  fail_count?: number;         // Number of failed payment attempts
  last_attempt_at?: string;    // Last payment attempt date
};
```

## Schemas

The system uses Zod schemas for runtime validation.

### tokenDataSchema

```typescript
const tokenDataSchema = z.object({
  token: z.string().min(5),
  cardLast4: z.string().length(4),
  expMonth: z.number().min(1).max(12),
  expYear: z.number().min(2024),
});
```

### subscriptionPlanSchema

```typescript
const subscriptionPlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.number().int().min(100),
  interval: z.enum(["monthly", "yearly"]),
  description: z.string().optional(),
});
```

## Error Handling

The system includes comprehensive error handling for payment processing:

### Error Codes

- `card_declined`: Card was declined by the issuing bank
- `expired_card`: Card is expired
- `insufficient_funds`: Not enough funds on the card
- `network_error`: Network connectivity issues
- `timeout`: Request took too long
- `sdk_load_failed`: Failed to load the Cardcom SDK
- `service_unavailable`: Payment service is currently unavailable

### SDK Loading Issues

The payment system attempts to load the Cardcom SDK from multiple URLs:
1. Primary URL: `https://secure.cardcom.solutions/js/openfields.js`
2. Fallback URLs if primary fails

If all SDK loading attempts fail:
1. User is shown a friendly error message
2. A retry button is provided
3. The error is logged for tracking

## Payment Processing Flow

1. Load and initialize the Cardcom SDK
2. User enters payment information
3. Card is tokenized on the client side (no raw card data is sent to server)
4. Token is verified and used for payment processing 
5. User gets redirected based on payment success/failure

## Components

### CardcomOpenFields

A React component that implements the Cardcom SDK for secure tokenization. It handles:

1. Loading the Cardcom SDK script
2. Displaying credit card input fields
3. Tokenizing card information securely
4. Error handling and validation

### Error Recovery

The system includes a recovery mechanism for payment errors:

1. Transient errors like network issues can be retried
2. Payment sessions are saved for recovery
3. Users can resume interrupted payments
4. Detailed error logging helps identify and resolve issues

## Best Practices

- Never send raw card data to the server (use tokenization)
- Always validate payment data on both client and server
- Implement proper error handling with recovery options
- Log payment errors for debugging and analysis
- Provide clear feedback to users when errors occur
