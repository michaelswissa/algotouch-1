
import React, { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContractDisplayProps {
  contractText: string;
}

const ContractDisplay: React.FC<ContractDisplayProps> = ({ contractText }) => {
  const contractRef = useRef<HTMLDivElement>(null);

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] w-full rounded-md">
          <div 
            className="p-6 text-sm rtl" 
            ref={contractRef}
            dir="rtl"
          >
            {contractText.split('\n').map((paragraph, index) => {
              // Handle section headers (numbered sections)
              if (/^\d+\./.test(paragraph.trim()) && !/^\d+\.\d+/.test(paragraph.trim())) {
                return <h3 key={index} className="text-lg font-bold mt-6 mb-3">{paragraph}</h3>;
              } 
              // Handle subsections (like 1.1, 2.3 etc)
              else if (/^\d+\.\d+/.test(paragraph.trim())) {
                return <h4 key={index} className="text-base font-semibold mt-4 mb-2">{paragraph}</h4>;
              } 
              // Regular paragraph
              else if (paragraph.trim()) {
                return <p key={index} className="mb-3 leading-relaxed text-base">{paragraph}</p>;
              }
              // Empty line for spacing
              return <div key={index} className="h-2"></div>;
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ContractDisplay;
