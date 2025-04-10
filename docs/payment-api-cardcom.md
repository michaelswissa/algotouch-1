
# Cardcom LowProfile Payment Integration

This documentation outlines the implementation of Cardcom's LowProfile payment solution in our application.

## Overview

Instead of using the Cardcom OpenFields SDK directly from the client-side, we're implementing a secure approach using Cardcom's LowProfile API. This method creates a secure iframe that handles all card information, ensuring PCI compliance.

## Architecture

### Client-Side Components

1. **CardcomLowProfileFrame**
   - React component that renders the secure iframe
   - Listens for postMessage events from the iframe
   - Forwards the secure token to the payment processing logic

2. **PaymentForm**
   - Container component that integrates with the payment flow
   - Displays plan information and payment status
   - Handles errors and recovery

### Server-Side Components (Supabase Edge Functions)

1. **create-lowprofile-deal**
   - Creates a payment session via Cardcom's LowProfile API
   - Returns a secure iframe URL to the client

2. **charge-token**
   - Processes the payment using the token received from LowProfile
   - Records the transaction in the database
   - Updates user subscription status

3. **verify-lowprofile-payment**
   - Verifies the status of a LowProfile payment
   - Used for asynchronous payment verification

4. **direct-payment**
   - Handles direct payment processing with token
   - Updates subscription status

## Database Tables

### user_payment_logs

Stores all payment attempts and their results:

```
id (UUID, PRIMARY KEY)
user_id (UUID, FK to auth.users)
token (TEXT)
amount (INTEGER)
approval_code (TEXT)
status (TEXT)
created_at (TIMESTAMP)
transaction_details (JSONB)
```

## Payment Flow

1. **Initialization**
   - Client requests a payment session via `create-lowprofile-deal`
   - Server creates a LowProfile deal with Cardcom and returns the iframe URL

2. **Card Entry**
   - User enters card details in the secure iframe
   - Cardcom processes the card data and generates a token

3. **Token Processing**
   - The iframe sends the token to the parent window via postMessage
   - Client receives the token and sends it to `charge-token` endpoint

4. **Payment Completion**
   - Server processes the payment and records the transaction
   - On success, user's subscription is updated
   - Client receives confirmation and displays success message

## Integration with Subscription System

The payment system integrates with the subscription system to:

1. Update subscription status after successful payment
2. Set the appropriate subscription period based on the plan
3. Handle trial periods and renewals

## Security Considerations

- No card data is ever handled by our client or server code
- All sensitive data processing happens within Cardcom's secure environment
- The token is the only piece of information transferred between systems
- All API calls to Cardcom are made from secure server-side functions

## Error Handling

The system includes comprehensive error handling:

- Card validation errors are displayed to the user
- Network and server errors are logged and can be retried
- Timeout handling ensures the user is never left in an uncertain state
- A recovery system helps users complete interrupted payments

## Testing

To test the payment system:

1. Use Cardcom's test environment credentials
2. Test cards are available in Cardcom's documentation
3. Enable diagnostic mode with Alt+Shift+D or by adding `?mode=dev` to the URL

## Configuration

The following environment variables must be set in Supabase:

- `CARDCOM_TERMINAL`: Your Cardcom terminal number
- `CARDCOM_USERNAME`: Your Cardcom API username
- `CARDCOM_API_PASSWORD`: Your Cardcom API password

## Troubleshooting

Common issues and solutions:

- **Iframe not loading**: Check network connectivity and Cardcom credentials
- **Token not received**: Ensure the iframe has proper permissions and the bridge script is working
- **Payment declined**: Check the error code in the Cardcom response for specific reasons
