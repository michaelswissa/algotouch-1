
import React from 'react';
import { Route } from 'react-router-dom';
import PaymentHandling from '@/pages/PaymentHandling';
import ProtectedRoute from '@/components/ProtectedRoute';

/**
 * Routes related to payment processing
 * 
 * These routes handle the success and error states when redirected
 * from the payment processor, and various recovery scenarios.
 */
export const PaymentRoutes = [
  // Main payment success route
  <Route 
    key="payment-success" 
    path="/payment/success" 
    element={
      <ProtectedRoute publicPaths={['/payment/success']}>
        <PaymentHandling />
      </ProtectedRoute>
    } 
  />,
  
  // Main payment error route
  <Route 
    key="payment-error" 
    path="/payment/error" 
    element={
      <ProtectedRoute publicPaths={['/payment/error']}>
        <PaymentHandling />
      </ProtectedRoute>
    } 
  />,
  
  // Specific error handling routes with error codes
  <Route 
    key="payment-error-with-code" 
    path="/payment/error/:errorCode" 
    element={
      <ProtectedRoute publicPaths={['/payment/error/:errorCode']}>
        <PaymentHandling />
      </ProtectedRoute>
    } 
  />,
  
  // Recovery handling route
  <Route 
    key="payment-recovery" 
    path="/payment/recovery/:sessionId" 
    element={
      <ProtectedRoute publicPaths={['/payment/recovery/:sessionId']}>
        <PaymentHandling recoveryMode={true} />
      </ProtectedRoute>
    } 
  />
];

export default PaymentRoutes;
