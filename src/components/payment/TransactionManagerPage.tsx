
import React from 'react';
import { useNavigate } from 'react-router-dom';
import CardcomTransactionManager from './CardcomTransactionManager';

const TransactionManagerPage: React.FC = () => {
  const navigate = useNavigate();
  
  const handleClose = () => {
    navigate('/my-subscription');
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">ניהול עסקאות תשלום</h1>
      <CardcomTransactionManager onClose={handleClose} />
    </div>
  );
};

export default TransactionManagerPage;
