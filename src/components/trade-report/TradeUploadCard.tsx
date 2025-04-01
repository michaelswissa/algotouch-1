
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet } from 'lucide-react';
import FileUploadArea from './FileUploadArea';
import AddTradeDialog from './AddTradeDialog';

interface TradeUploadCardProps {
  selectedFile: File | null;
  isUploading: boolean;
  onFileChange: (file: File) => void;
  onAddManualTrade: (formData: any) => void;
}

const TradeUploadCard: React.FC<TradeUploadCardProps> = ({
  selectedFile,
  isUploading,
  onFileChange,
  onAddManualTrade
}) => {
  return (
    <Card className="mb-6 hover-glow">
      <CardHeader>
        <CardTitle>העלאת נתוני מסחר</CardTitle>
      </CardHeader>
      <CardContent>
        <FileUploadArea 
          selectedFile={selectedFile}
          isUploading={isUploading}
          onFileChange={onFileChange}
        />
        
        <div className="flex justify-between items-center border-t pt-4">
          <p className="text-sm text-gray-500">או</p>
          <AddTradeDialog onAddTrade={onAddManualTrade} />
        </div>
      </CardContent>
    </Card>
  );
};

export default TradeUploadCard;
