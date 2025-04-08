
import React from 'react';
import { useParams } from 'react-router-dom';
import ContractViewerEnhanced from '@/components/subscription/ContractViewerEnhanced';
import { PageHeader } from '@/components/shared/page-header';

const ContractPage: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();

  return (
    <div className="container py-6 space-y-6">
      <PageHeader heading="צפייה בהסכם" text="הצג ושתף הסכמים חתומים" />
      
      <ContractViewerEnhanced 
        contractId={contractId} 
        className="max-w-3xl mx-auto"
      />
    </div>
  );
};

export default ContractPage;
