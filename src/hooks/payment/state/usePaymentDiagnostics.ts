
import { useRef } from 'react';

interface DiagnosticData {
  startTime: number;
  lastCheckTime: number;
  statusChecks: number;
  errors: string[];
}

export const usePaymentDiagnostics = () => {
  const diagnosticRef = useRef<DiagnosticData>({
    startTime: 0,
    lastCheckTime: 0,
    statusChecks: 0,
    errors: []
  });

  const resetDiagnostics = () => {
    diagnosticRef.current = {
      startTime: 0,
      lastCheckTime: 0,
      statusChecks: 0,
      errors: []
    };
  };

  const initializeDiagnostics = () => {
    diagnosticRef.current = {
      startTime: Date.now(),
      lastCheckTime: Date.now(),
      statusChecks: 0,
      errors: []
    };
  };

  const updateDiagnostics = (error?: string) => {
    const now = Date.now();
    const diagData = diagnosticRef.current;
    diagData.lastCheckTime = now;
    diagData.statusChecks++;
    if (error) {
      diagData.errors.push(error);
    }
  };

  const getDiagnosticsSummary = () => {
    const now = Date.now();
    const diagData = diagnosticRef.current;
    return {
      totalDuration: now - diagData.startTime,
      checksPerformed: diagData.statusChecks,
      errors: diagData.errors
    };
  };

  return {
    diagnosticRef,
    resetDiagnostics,
    initializeDiagnostics,
    updateDiagnostics,
    getDiagnosticsSummary
  };
};
