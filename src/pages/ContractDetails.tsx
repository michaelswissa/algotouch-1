
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ContractViewer from '@/components/subscription/ContractViewer';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

const ContractDetails: React.FC = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate(-1);
  };

  return (
    <Layout className="py-8">
      <div className="mb-4">
        <Button 
          variant="outline" 
          className="flex items-center gap-2" 
          onClick={handleBack}
        >
          <ChevronRight className="h-4 w-4" />
          חזור
        </Button>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">פרטי הסכם</h1>
        {contractId ? (
          <ContractViewer contractId={contractId} />
        ) : (
          <div className="text-center p-6">
            <p className="text-red-500">מזהה הסכם חסר</p>
            <Button className="mt-4" onClick={handleBack}>
              חזור
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ContractDetails;
