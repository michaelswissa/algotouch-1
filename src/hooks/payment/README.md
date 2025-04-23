
# Payment Validation Hooks

## Overview
These hooks provide comprehensive validation for payment-related form inputs, ensuring data integrity and user experience during the payment process.

## Hooks

### `useCardValidation`
Responsible for validating credit card number and CVV.

#### Features:
- Validates card number format
- Checks card type
- Performs CVV validation
- Provides real-time validation feedback

#### Example Usage:
```typescript
const { 
  cardNumberError, 
  cvvError, 
  isCardNumberValid, 
  isCvvValid, 
  validateCardNumber, 
  validateCvv 
} = useCardValidation();
```

### `useCardholderValidation`
Validates cardholder-related information.

#### Features:
- Validates cardholder name length
- Validates ID number format
- Provides error messages for invalid inputs

#### Example Usage:
```typescript
const { 
  cardholderNameError, 
  idNumberError, 
  validateIdNumber 
} = useCardholderValidation(cardholderName, cardOwnerId);
```

### `useExpiryValidation`
Validates credit card expiration date.

#### Features:
- Checks month format (01-12)
- Validates year format
- Ensures card is not expired
- Provides expiration-related error messages

#### Example Usage:
```typescript
const { expiryError } = useExpiryValidation(expiryMonth, expiryYear);
```

### `usePaymentValidation`
Combines all validation hooks into a single validation utility.

#### Features:
- Aggregates validation from all individual hooks
- Provides a comprehensive `isValid()` method
- Simplifies form-wide validation

#### Example Usage:
```typescript
const { 
  isValid, 
  cardNumberError, 
  cardholderNameError 
} = usePaymentValidation({
  cardholderName, 
  cardOwnerId,
  expiryMonth, 
  expiryYear 
});
```

## Best Practices
- Always use these hooks for form validation
- Provide immediate feedback to users
- Handle error states gracefully
- Combine with form libraries like `react-hook-form` for enhanced validation

## Error Handling
Each hook returns specific error messages to guide users in correcting their inputs.

## Performance
These hooks are designed to be lightweight and provide real-time validation without significant performance overhead.
