
# CardCom Payment Integration

This project implements a secure payment processing system using CardCom payment gateway.

## Key Components

### Edge Functions

1. **cardcom-payment** - Centralized function for payment initialization
   - Handles both redirect and iframe payment flows
   - Creates payment sessions in the database

2. **cardcom-webhook** - Processes payment callbacks from CardCom
   - Updates payment status
   - Creates subscriptions based on successful payments

3. **cardcom-recurring** - Handles recurring payments
   - Processes due subscriptions
   - Manages subscription cancellations

4. **cardcom-status** - Checks payment status
   - Verifies transactions against CardCom API
   - Updates local payment records

5. **cardcom-submit** - Submits payment details
   - Handles CardCom form submissions
   - Validates input data

### Database Tables

The system uses several tables to track payments and subscriptions:
- `payment_sessions` - Tracks payment attempts
- `user_payment_logs` - Stores payment history
- `subscriptions` - Manages user subscription details
- `recurring_payments` - Stores payment tokens for recurring billing
- `plans` - Defines subscription plans

### Security Features

- All API keys stored as environment variables
- Input validation on all requests
- Duplicate payment prevention
- Error logging and monitoring

### Recurring Billing

The system includes a cron job that runs daily to:
1. Process subscriptions due for renewal
2. Update expired trial subscriptions
3. Invalidate tokens after multiple failed payment attempts

## Configuration

The CardCom integration requires the following environment variables:
- `CARDCOM_TERMINAL_NUMBER` - Terminal number from CardCom
- `CARDCOM_API_NAME` - API username
- `CARDCOM_API_PASSWORD` - API password (required for some operations)

## Subscription Plans

Available subscription plans:
1. **Monthly** - 371₪/month with 30-day free trial
2. **Annual** - 3,371₪/year with 30-day free trial
3. **VIP** - 13,121₪ one-time payment for lifetime access
