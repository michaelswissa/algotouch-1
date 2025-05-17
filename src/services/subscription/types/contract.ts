
/**
 * Types for contract-related data structures
 */

import { Json } from "@/integrations/supabase/types";

/**
 * Represents a signed contract document
 */
export interface ContractDocument {
  id: string;
  user_id: string;
  plan_id: string;
  full_name: string;
  email: string;
  address?: string;
  phone?: string;
  id_number?: string;
  signature: string;
  contract_html: string;
  contract_version: string;
  agreed_to_terms: boolean;
  agreed_to_privacy: boolean;
  pdf_url?: string | null;
  created_at: string;
  updated_at: string;
  browser_info?: ContractBrowserInfo | Json;
  ip_address?: string;
}

/**
 * Browser information captured during contract signing for audit purposes
 */
export interface ContractBrowserInfo {
  userAgent: string;
  language: string;
  platform: string;
  screenSize: string;
  timeZone: string;
  [key: string]: any;
}

/**
 * Data structure for contract signing process
 */
export interface ContractSignatureData {
  signature: string;
  contractHtml?: string;
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
  contractVersion?: string;
  browserInfo?: ContractBrowserInfo;
  planId?: string;
  tempContractId?: string;
  userId?: string;
  [key: string]: any;
}

/**
 * Result of a contract operation
 */
export interface ContractOperationResult {
  success: boolean;
  contractId?: string;
  error?: Error | any;
  message?: string;
}

/**
 * Props for contract display components
 */
export interface ContractDisplayProps {
  contractData: ContractDocument;
  contractHtml: string;
}
