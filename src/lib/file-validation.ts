
/**
 * Utility functions for file validation
 */

/**
 * Validates if a file is a valid CSV or Excel file
 * @param file The file to validate
 * @returns Whether the file is valid
 */
export const isValidTradeDataFile = (file: File): boolean => {
  if (!file) return false;
  
  const fileType = file.type;
  return (
    fileType === 'text/csv' ||
    fileType === 'application/vnd.ms-excel' ||
    fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.name.endsWith('.csv') ||
    file.name.endsWith('.xlsx') ||
    file.name.endsWith('.xls')
  );
};

/**
 * Returns the validation error message for an invalid file
 * @returns Error message for invalid file type
 */
export const getInvalidFileTypeMessage = (): { title: string; description: string } => {
  return {
    title: "סוג קובץ לא נתמך",
    description: "יש להעלות רק קבצי CSV או Excel"
  };
};
