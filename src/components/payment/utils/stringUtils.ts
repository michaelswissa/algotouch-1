
// Helper functions for string manipulation

// Clear non-numeric characters from string
export const clearNumber = (value: string = ''): string => {
  return value.replace(/\D+/g, '');
};

// Format string with a specific mask
export const formatWithMask = (value: string, pattern: string): string => {
  let i = 0;
  return pattern.replace(/9/g, () => value[i++] || '');
};

// Format currency amount
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Add ellipsis to text that exceeds max length
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
