
import React from 'react';
import { Upload, File, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadAreaProps {
  selectedFile: File | null;
  isUploading: boolean;
  error?: string | null;
  onFileChange: (file: File) => void;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({ 
  selectedFile, 
  isUploading, 
  error,
  onFileChange 
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleBrowseFiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileChange(file);
    }
  };
  
  return (
    <div 
      className={`w-full p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center mb-4 transition-colors
        ${error ? 'bg-red-50 border-red-300' : selectedFile ? 'bg-green-50 border-green-300' : 'bg-slate-50/50 border-slate-300 hover:bg-slate-50'}`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.xls,.xlsx"
        className="hidden"
      />
      
      {selectedFile ? (
        <div className="flex flex-col items-center space-y-2">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-1">
            {isUploading ? (
              <span className="animate-spin">
                <Upload className="h-6 w-6 text-green-600" />
              </span>
            ) : (
              <File className="h-6 w-6 text-green-600" />
            )}
          </div>
          <p className="text-base font-medium">{selectedFile.name}</p>
          <p className="text-sm text-gray-500">
            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
          </p>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isUploading} 
              onClick={handleBrowseFiles}
            >
              החלף קובץ
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <Upload className="h-6 w-6 text-slate-600" />
          </div>
          <h3 className="text-lg font-medium mb-1">גרור לכאן או בחר קובץ</h3>
          <p className="text-sm text-gray-500 text-center mb-4">
            העלה קובץ CSV או Excel עם נתוני המסחר שלך
          </p>
          
          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded-md mb-4 w-full text-center border border-red-200">
              <div className="font-semibold mb-1">שגיאה בהעלאת הקובץ</div>
              <div>{error}</div>
            </div>
          )}
          
          <Button 
            variant="outline" 
            className="bg-white" 
            onClick={handleBrowseFiles}
          >
            בחר קובץ
          </Button>
        </>
      )}
    </div>
  );
};

export default FileUploadArea;
