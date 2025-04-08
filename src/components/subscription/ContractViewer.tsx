
import React from 'react';
import ContractViewerEnhanced from './ContractViewerEnhanced';

interface ContractViewerProps {
  userId?: string;
  contractId?: string;
  onBack?: () => void;
  className?: string;
}

const ContractViewer: React.FC<ContractViewerProps> = (props) => {
  return <ContractViewerEnhanced {...props} />;
};

export default ContractViewer;
