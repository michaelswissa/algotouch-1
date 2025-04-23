
import { useState, useEffect } from 'react';

interface ExpiryValidationState {
  expiryError: string;
}

export const useExpiryValidation = (expiryMonth: string, expiryYear: string) => {
  const [validationState, setValidationState] = useState<ExpiryValidationState>({
    expiryError: '',
  });

  useEffect(() => {
    if (expiryMonth && expiryYear) {
      // Ensure month is 01-12 format
      if (!/^(0[1-9]|1[0-2])$/.test(expiryMonth)) {
        setValidationState(prev => ({
          ...prev,
          expiryError: 'פורמט חודש לא תקין (דרוש 01-12)'
        }));
        return;
      }

      // Ensure year is 2-digit format
      if (!/^\d{2}$/.test(expiryYear)) {
        setValidationState(prev => ({
          ...prev,
          expiryError: 'פורמט שנה לא תקין (דרוש 2 ספרות)'
        }));
        return;
      }

      // Check if date is in the future
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100; // 2-digit year
      const currentMonth = currentDate.getMonth() + 1;
      const selectedYear = parseInt(expiryYear);
      const selectedMonth = parseInt(expiryMonth);

      if (selectedYear < currentYear || 
         (selectedYear === currentYear && selectedMonth < currentMonth)) {
        setValidationState(prev => ({
          ...prev,
          expiryError: 'תאריך תפוגה לא תקין - הכרטיס פג תוקף'
        }));
      } else {
        setValidationState(prev => ({ ...prev, expiryError: '' }));
      }
    }
  }, [expiryMonth, expiryYear]);

  return validationState;
};

