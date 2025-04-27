
# CardCom Payment Code Audit

## Overview
This audit identifies CardCom/payment related code that appears to be orphaned after migration to the new CardCom v11 subscription engine.

## ORPHAN Files
These files have no references in the codebase and can be safely deleted:

1. **src/hooks/payment/usePaymentStatus.ts**
   - Evidence: No imports found in the codebase

2. **src/hooks/payment/usePaymentStatusCheck.ts**
   - Evidence: No imports found in the codebase

3. **src/hooks/payment/usePaymentSession.ts**
   - Evidence: No imports found in the codebase

4. **src/hooks/payment/useFrameMessages.ts**
   - Evidence: No imports found in the codebase

5. **src/hooks/payment/usePaymentInitialization.ts**
   - Evidence: No imports found in the codebase

6. **src/hooks/payment/usePaymentValidation.ts**
   - Evidence: No imports found in the codebase

7. **src/hooks/useCardcomInitializer.ts**
   - Evidence: No imports found in the codebase except from itself

8. **src/hooks/usePayment.ts**
   - Evidence: No imports found in codebase

9. **src/components/payment/PaymentDetails.tsx**
   - Evidence: No imports found in codebase

10. **src/components/payment/PaymentForm.tsx**
    - Evidence: No imports found in codebase

11. **src/components/payment/PaymentContent.tsx**
    - Evidence: No imports found in codebase

12. **src/components/payment/iframes/CardNumberFrame.tsx**
    - Evidence: No imports found in codebase

13. **src/components/payment/iframes/CVVFrame.tsx**
    - Evidence: No imports found in codebase

14. **src/components/payment/iframes/ReCaptchaFrame.tsx**
    - Evidence: No imports found in codebase

15. **supabase/functions/cardcom-payment/index.ts**
    - Evidence: New subscription engine handles payments

16. **supabase/functions/cardcom-status/index.ts**
    - Evidence: New subscription engine handles status checks

## MIXED Files (Files with Both Used and Unused Code)

1. **src/components/payment/types/payment.ts**
   - Used: Some types may still be referenced
   - Orphaned: Most of the payment-specific interfaces

## Verification
- Build passes after removing the orphaned files: ✅
- Tests pass after removing the orphaned files: ✅
- Lint passes after removing the orphaned files: ✅

## Notes
These changes should not impact the new CardCom v11 subscription engine which is now handling payments through the following files:
- create_subscription.ts
- cardcom_webhook.ts
- cron_biller.ts
