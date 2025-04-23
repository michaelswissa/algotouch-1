
import { useCardValidation } from './validation/useCardValidation';
import { useCardholderValidation } from './validation/useCardholderValidation';
import { useExpiryValidation } from './validation/useExpiryValidation';

interface PaymentValidationProps {
  cardholderName: string;
  cardOwnerId: string;
  expiryMonth: string;
  expiryYear: string;
}

export const usePaymentValidation = ({ 
  cardholderName, 
  cardOwnerId,
  expiryMonth, 
  expiryYear 
}: PaymentValidationProps) => {
  const cardValidation = useCardValidation();
  const cardholderValidation = useCardholderValidation(cardholderName, cardOwnerId);
  const expiryValidation = useExpiryValidation(expiryMonth, expiryYear);

  const isValid = () => {
    return !cardValidation.cardNumberError &&
           !cardValidation.cvvError &&
           !cardholderValidation.cardholderNameError &&
           !cardholderValidation.idNumberError &&
           !expiryValidation.expiryError &&
           cardValidation.isCardNumberValid &&
           cardValidation.isCvvValid &&
           cardholderName.length >= 2 &&
           cardOwnerId.length === 9 &&
           expiryMonth &&
           expiryYear;
  };

  return {
    ...cardValidation,
    ...cardholderValidation,
    ...expiryValidation,
    isValid,
  };
};

