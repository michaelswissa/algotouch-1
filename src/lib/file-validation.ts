
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
 * Validates if a file is a valid image file
 * @param file The file to validate
 * @returns Whether the file is valid
 */
export const isValidImageFile = (file: File): boolean => {
  if (!file) return false;
  
  const fileType = file.type;
  return (
    fileType.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
  );
};

/**
 * Validates if a file is a valid PDF file
 * @param file The file to validate
 * @returns Whether the file is valid
 */
export const isValidPDFFile = (file: File): boolean => {
  if (!file) return false;
  
  const fileType = file.type;
  return (
    fileType === 'application/pdf' ||
    file.name.endsWith('.pdf')
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

/**
 * Returns the validation error message for an invalid image file
 * @returns Error message for invalid image file type
 */
export const getInvalidImageTypeMessage = (): { title: string; description: string } => {
  return {
    title: "סוג קובץ לא נתמך",
    description: "יש להעלות רק קבצי תמונה (JPG, PNG, GIF, וכו')"
  };
};

/**
 * Returns the validation error message for an invalid PDF file
 * @returns Error message for invalid PDF file type
 */
export const getInvalidPDFTypeMessage = (): { title: string; description: string } => {
  return {
    title: "סוג קובץ לא נתמך",
    description: "יש להעלות רק קבצי PDF"
  };
};
