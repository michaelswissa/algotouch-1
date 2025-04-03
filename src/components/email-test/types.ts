
export type ConnectionStatus = 'unknown' | 'success' | 'error';

export interface EmailTestResult {
  success?: boolean;
  message?: string;
  error?: string;
  [key: string]: any;
}
