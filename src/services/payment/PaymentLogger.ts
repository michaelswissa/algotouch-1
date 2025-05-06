/**
 * Payment logger service for safe logging payment-related operations
 * Ensures PCI compliance by filtering sensitive data
 */
export class PaymentLogger {
  static readonly DEBUG_ENABLED = import.meta.env.DEV || 
    localStorage.getItem('debug_payment') === 'true';
  
  // Helper to sanitize sensitive data
  private static sanitizeData(data: any): any {
    if (!data) return data;
    
    // Clone the data to avoid modifying the original
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // List of potentially sensitive fields to mask
    const sensitiveFields = [
      'cardNumber', 'CardNumber', 'cvv', 'CVV', 'cvv2', 'CVV2',
      'cardSecurityCode', 'password', 'Password', 'ApiPassword',
      'token', 'Token', 'ApiName', 'apiName', 'apiKey', 'ApiKey',
      'secretKey', 'SecretKey'
    ];
    
    // Function to recursively sanitize an object
    const recursiveSanitize = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.keys(obj).forEach(key => {
        // Check if field name is sensitive
        if (sensitiveFields.includes(key)) {
          // Mask value but preserve type indication
          const value = obj[key];
          if (typeof value === 'string') {
            obj[key] = value.length > 0 ? '****' : '';
          } else if (typeof value === 'number') {
            obj[key] = 0;
          }
        }
        // For card numbers, keep only last 4 digits
        else if (key.toLowerCase().includes('cardnumber') && typeof obj[key] === 'string' && obj[key].length > 4) {
          obj[key] = `****${obj[key].slice(-4)}`;
        }
        // Recurse into nested objects
        else if (obj[key] && typeof obj[key] === 'object') {
          recursiveSanitize(obj[key]);
        }
      });
    };
    
    recursiveSanitize(sanitized);
    return sanitized;
  }
  
  static log(message: string, data?: any): void {
    if (this.DEBUG_ENABLED) {
      if (data) {
        console.log(`[Payment] ${message}`, this.sanitizeData(data));
      } else {
        console.log(`[Payment] ${message}`);
      }
    }
  }
  
  static error(message: string, error?: any): void {
    // Always log errors, even in production
    if (error) {
      console.error(`[Payment Error] ${message}`, this.sanitizeData(error));
    } else {
      console.error(`[Payment Error] ${message}`);
    }
  }
  
  static warn(message: string, data?: any): void {
    if (this.DEBUG_ENABLED) {
      if (data) {
        console.warn(`[Payment Warning] ${message}`, this.sanitizeData(data));
      } else {
        console.warn(`[Payment Warning] ${message}`);
      }
    }
  }
  
  static info(message: string, data?: any): void {
    // Info logs are important operational events, log them even in production
    if (data) {
      console.info(`[Payment Info] ${message}`, this.sanitizeData(data));
    } else {
      console.info(`[Payment Info] ${message}`);
    }
  }
}
