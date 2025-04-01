
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { isValidTradeDataFile, getInvalidFileTypeMessage } from '@/lib/file-validation';

type FileValidator = (file: File) => boolean;
type ErrorMessageProvider = () => { title: string; description: string };

interface UseFileUploadOptions {
  validator?: FileValidator;
  errorMessageProvider?: ErrorMessageProvider;
  onFileAccepted?: (file: File) => void;
  maxSizeInMB?: number;
}

interface UseFileUploadReturn {
  selectedFile: File | null;
  isUploading: boolean;
  handleFileSelected: (file: File) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  resetFile: () => void;
}

/**
 * Custom hook for handling file uploads with validation
 */
export const useFileUpload = ({
  validator = isValidTradeDataFile,
  errorMessageProvider = getInvalidFileTypeMessage,
  onFileAccepted,
  maxSizeInMB = 10
}: UseFileUploadOptions = {}): UseFileUploadReturn => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const validateFileSize = (file: File): boolean => {
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSizeInMB) {
      toast({
        title: "קובץ גדול מדי",
        description: `הקובץ חייב להיות קטן מ-${maxSizeInMB}MB`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleFileSelected = (file: File) => {
    if (!validateFileSize(file)) return;
    
    if (validator(file)) {
      setSelectedFile(file);
      setIsUploading(true);
      
      if (onFileAccepted) {
        Promise.resolve(onFileAccepted(file))
          .finally(() => {
            setIsUploading(false);
          });
      } else {
        setIsUploading(false);
      }
    } else {
      const errorMsg = errorMessageProvider();
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      handleFileSelected(file);
    }
    // Reset the input value to allow selecting the same file again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const resetFile = () => {
    setSelectedFile(null);
    setIsUploading(false);
  };

  return {
    selectedFile,
    isUploading,
    handleFileSelected,
    handleFileChange,
    handleDragOver,
    handleDrop,
    resetFile
  };
};
