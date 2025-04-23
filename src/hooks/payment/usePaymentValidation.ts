
import { useCardValidation } from './validation/useCardValidation';
import { useCardholderValidation } from './validation/useCardholderValidation';
import { useExpiryValidation } from './validation/useExpiryValidation';

interface PaymentValidationProps {
  cardholderName: string;
  cardOwnerId: string;
  expiryMonth: string;
  expiryYear: string;
  idLength?: number; // Optional custom ID length requirement
  minNameLength?: number; // Optional custom name length requirement
}

export const usePaymentValidation = ({ 
  cardholderName, 
  cardOwnerId,
  expiryMonth, 
  expiryYear,
  idLength = 9, // Default to 9 digits for Israeli IDs
  minNameLength = 2 // Default to 2 characters minimum
}: PaymentValidationProps) => {
  // Initialize all validation hooks
  const cardValidation = useCardValidation();
  const cardholderValidation = useCardholderValidation(cardholderName, cardOwnerId); // Fixed: only passing 1 param as expected
  const expiryValidation = useExpiryValidation(expiryMonth, expiryYear);

  // Combined validation function that checks all validation rules
  const isValid = () => {
    // Check for any validation errors
    const hasNoErrors = !cardValidation.cardNumberError &&
                       !cardValidation.cvvError &&
                       !cardholderValidation.cardholderNameError &&
                       !cardholderValidation.idNumberError &&
                       !expiryValidation.expiryError;
    
    // Check for required field values
    const hasRequiredFields = cardValidation.isCardNumberValid &&
                             cardValidation.isCvvValid &&
                             cardholderName.length >= minNameLength &&
                             cardOwnerId.length === idLength &&
                             expiryMonth.length > 0 &&
                             expiryYear.length > 0;
    
    return hasNoErrors && hasRequiredFields;
  };

  // Return all validation states and helpers from individual hooks
  return {
    ...cardValidation,
    ...cardholderValidation,
    ...expiryValidation,
    isValid,
  };
};
