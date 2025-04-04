
import React from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { formatCreditCardNumber, formatExpirationDate, formatCVV } from './utils/paymentHelpers';

interface PaymentDetailsProps {
  cardNumber: string;
  setCardNumber: (value: string) => void;
  cardholderName: string;
  setCardholderName: (value: string) => void;
  expiryDate: string;
  setExpiryDate: (value: string) => void;
  cvv: string;
  setCvv: (value: string) => void;
  onCvvFocus?: () => void;
  onCvvBlur?: () => void;
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({
  cardNumber,
  setCardNumber,
  cardholderName,
  setCardholderName,
  expiryDate,
  setExpiryDate,
  cvv,
  setCvv,
  onCvvFocus,
  onCvvBlur
}) => {
  const form = useForm();
  
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = formatCreditCardNumber(e.target.value);
    setCardNumber(value);
  };
  
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = formatExpirationDate(e.target.value);
    setExpiryDate(value);
  };
  
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = formatCVV(e.target.value);
    setCvv(value);
  };

  return (
    <Form {...form}>
      <form className="space-y-4">
        <FormField
          control={form.control}
          name="cardNumber"
          render={() => (
            <FormItem>
              <FormLabel htmlFor="cardNumber">מספר כרטיס</FormLabel>
              <FormControl>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  className="font-mono"
                  maxLength={19}
                  dir="ltr"
                  autoComplete="cc-number"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cardholderName"
          render={() => (
            <FormItem>
              <FormLabel htmlFor="cardholderName">שם בעל הכרטיס</FormLabel>
              <FormControl>
                <Input
                  id="cardholderName"
                  placeholder="ישראל ישראלי"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  autoComplete="cc-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="expiryDate"
            render={() => (
              <FormItem>
                <FormLabel htmlFor="expiryDate">תוקף</FormLabel>
                <FormControl>
                  <Input
                    id="expiryDate"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={handleExpiryChange}
                    className="font-mono"
                    maxLength={5}
                    dir="ltr"
                    autoComplete="cc-exp"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cvv"
            render={() => (
              <FormItem>
                <FormLabel htmlFor="cvv">קוד אבטחה (CVV)</FormLabel>
                <FormControl>
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={cvv}
                    onChange={handleCvvChange}
                    onFocus={onCvvFocus}
                    onBlur={onCvvBlur}
                    className="font-mono"
                    maxLength={4}
                    dir="ltr"
                    autoComplete="cc-csc"
                    aria-label="Security code (CVV)"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
};

export default PaymentDetails;
