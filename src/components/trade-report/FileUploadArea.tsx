import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileUp, FileText } from 'lucide-react';
import { useFileUpload } from '@/hooks/use-file-upload';
interface FileUploadAreaProps {
  selectedFile: File | null;
  isUploading: boolean;
  onFileChange: (file: File) => void;
}
const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  selectedFile,
  isUploading,
  onFileChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    handleFileChange,
    handleDragOver,
    handleDrop
  } = useFileUpload({
    onFileAccepted: onFileChange
  });
  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  return <div className="mb-6">
      <p className="text-gray-600 mb-4">
        העלה קובץ CSV או Excel המכיל את נתוני המסחר שלך. הקובץ צריך לכלול עמודות עבור מספר חשבון, חוזה, שם סיגנל, כיוון, תאריכי כניסה ויציאה, מחירים, רווח/הפסד ונטו.
      </p>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors duration-200 hover:border-primary/50 cursor-pointer" onDragOver={handleDragOver} onDrop={handleDrop} onClick={handleFileClick}>
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
        
        <div className="mb-4">
          <Upload className="h-10 w-10 mx-auto text-gray-400" />
        </div>
        <p className="text-lg font-medium mb-2 text-center">גרור ושחרר קובץ CSV או Excel</p>
        <p className="text-sm text-gray-500 mb-4 text-center">או</p>
        
        <div className="flex justify-center">
          <Button variant="outline" className="gap-2" onClick={e => {
          e.stopPropagation();
          handleFileClick();
        }}>
            <FileUp size={16} />
            בחר קובץ
          </Button>
        </div>
        
        {selectedFile && <div className="mt-4">
            <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-md dark:bg-blue-950/30">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div className="flex-1 text-start">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
              </div>
              <Button disabled={isUploading} variant="secondary">
                {isUploading ? 'מעלה...' : 'הועלה בהצלחה'}
              </Button>
            </div>
          </div>}
      </div>
    </div>;
};
export default FileUploadArea;