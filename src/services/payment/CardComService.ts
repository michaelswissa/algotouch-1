
/**
 * Service for handling CardCom payment processing and redirects
 */
export class CardComService {
  /**
   * Parses redirect URL parameters from CardCom
   */
  static handleRedirectParameters(searchParams: URLSearchParams) {
    // Extract common parameters
    const lowProfileCode = searchParams.get('LowProfileCode') || '';
    const responseCode = searchParams.get('ResponseCode') || '';
    const sessionId = searchParams.get('session_id') || '';
    
    // Determine success/failure status
    let status: 'success' | 'failed' | 'unknown' = 'unknown';
    
    if (responseCode === '0') {
      status = 'success';
    } else if (responseCode && responseCode !== '0') {
      status = 'failed';
    } else if (window.location.pathname.includes('success')) {
      status = 'success';
    } else if (window.location.pathname.includes('failed')) {
      status = 'failed';
    }
    
    return {
      lowProfileCode,
      responseCode,
      sessionId,
      status,
      // Include all other parameters for debugging
      allParams: Object.fromEntries(searchParams.entries())
    };
  }
}
