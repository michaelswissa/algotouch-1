
import React from 'react';
import { Route } from 'react-router-dom';
import PaymentHandling from '@/pages/PaymentHandling';
import ProtectedRoute from '@/components/ProtectedRoute';

export const PaymentRoutes = [
  <Route 
    key="payment-success" 
    path="/payment/success" 
    element={
      <ProtectedRoute publicPaths={['/payment/success']}>
        <PaymentHandling />
      </ProtectedRoute>
    } 
  />,
  <Route 
    key="payment-error" 
    path="/payment/error" 
    element={
      <ProtectedRoute publicPaths={['/payment/error']}>
        <PaymentHandling />
      </ProtectedRoute>
    } 
  />
];

export default PaymentRoutes;
