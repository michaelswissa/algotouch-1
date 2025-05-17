
import React from 'react';
import ContractDownload from './ContractDownload';

interface ContractContentProps {
  contractData: any;
  contractHtml: string;
}

const ContractContent: React.FC<ContractContentProps> = ({ contractData, contractHtml }) => {
  return (
    <div className="space-y-4">
      <ContractDownload contractData={contractData} contractHtml={contractHtml} />
      
      <div className="w-full h-[400px] border rounded-md overflow-auto">
        <div className="p-4" dangerouslySetInnerHTML={{ __html: contractHtml }} />
      </div>
    </div>
  );
};

export default ContractContent;
