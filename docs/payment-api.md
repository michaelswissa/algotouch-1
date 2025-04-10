
# Payment API Documentation

This document outlines the types, schemas, and modules used in our payment processing system.

## Types

### TokenData

Represents a tokenized credit card for secure payment processing.

```typescript
export type TokenData = {
  token: string;               // Secure token representing the card (from payment processor)
  lastFourDigits: string;      // Last four digits of the credit card
  expiryMonth: number;         // Card expiry month (1-12)
  expiryYear: number;          // Card expiry year (4 digits)
  cardholderName?: string;     // Optional cardholder name
};
```

### SubscriptionPlan

Represents a subscription plan that users can purchase.

```typescript
export interface SubscriptionPlan {
  id: string;                  // Unique identifier
  name: string;                // Display name
  price: number;               // Price in cents/agorot
  description?: string;        // Plan description
  features?: string[];         // List of features included
  trialDays?: number;          // Number of trial days (0 = no trial)
  billingCycle: 'monthly' | 'annual'; // Billing frequency
  currency?: string;           // Currency code (default: USD)
}
```

### PaymentError

Represents an error that occurred during payment processing.

```typescript
export interface PaymentError {
  code: string;                // Error code
  message: string;             // User-friendly error message
  raw?: any;                   // Raw error data
}
```

### PaymentSessionData

Represents a saved payment session for recovery.

```typescript
export interface PaymentSessionData {
  sessionId?: string;          // Unique session identifier
  userId?: string;             // User ID if authenticated
  email?: string;              // User email for recovery
  planId?: string;             // Selected plan ID
  paymentDetails?: any;        // Payment details
  expiresAt?: string;          // Session expiry timestamp
}
```

### CardcomChargeResponse

Represents a response from the Cardcom payment gateway.

```typescript
export interface CardcomChargeResponse {
  IsApproved: "1" | "0";       // Success (1) or failure (0)
  ReturnValue?: number;        // Return code
  Message?: string;            // Response message
  TokenApprovalNumber?: string; // Approval number for successful charges
}
```

### UserSubscription

Represents a user's subscription in the database.

```typescript
export interface UserSubscription {
  user_id: string;             // User ID (foreign key)
  plan_id: string;             // Plan ID
  status: "active" | "suspended" | "cancelled"; // Subscription status
  renewed_at: string;          // Last renewal date
  created_at: string;          // Creation date
  fail_count?: number;         // Number of failed payment attempts
  last_attempt_at?: string;    // Last payment attempt date
}
```

## Schemas

The system uses Zod schemas for runtime validation.

### tokenDataSchema

```typescript
const tokenDataSchema = z.object({
  token: z.string().min(5),
  lastFourDigits: z.string().length(4),
  expiryMonth: z.number().min(1).max(12),
  expiryYear: z.number().min(2023),
  cardholderName: z.string().optional(),
});
```

### subscriptionPlanSchema

```typescript
const subscriptionPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().int().min(0),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  trialDays: z.number().int().min(0).optional(),
  billingCycle: z.enum(["monthly", "annual"]),
  currency: z.string().optional(),
});
```

## Components

### CardcomOpenFields

A React component that implements the Cardcom SDK for secure tokenization. It handles:

1. Loading the Cardcom SDK script
2. Displaying credit card input fields
3. Tokenizing card information securely
4. Error handling and validation

### Payment Flow

1. User enters payment information in `CardcomOpenFields`
2. Card is tokenized by Cardcom SDK in the browser
3. Token (not card data) is sent to the server
4. Server processes payment with token through Edge Functions
5. Subscription is activated for the user

## Edge Functions

The system uses Supabase Edge Functions for secure server-side processing:

1. **direct-payment**: Processes new credit card payments
2. **recover-payment-session**: Handles payment recovery after failures
3. **cardcom-payment/verify-payment**: Verifies payments from external sources

## Best Practices

- Never send raw card data to the server (use tokenization)
- Always validate payment data on both client and server
- Implement proper error handling with recovery options
- Follow PCI DSS compliance guidelines

