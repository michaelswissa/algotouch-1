
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
  return <Card className="mb-6 hover-glow mx-0">
      <CardHeader className="text-center">
        <CardTitle className="flex justify-center items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <span>העלאת נתוני מסחר</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <FileUploadArea selectedFile={selectedFile} isUploading={isUploading} onFileChange={onFileChange} />
        
        <div className="flex justify-between items-center border-t pt-4 w-full">
          <p className="text-sm text-center text-slate-400">או</p>
          <AddTradeDialog onAddTrade={onAddManualTrade} />
        </div>
      </CardContent>
    </Card>;
};
export default TradeUploadCard;
