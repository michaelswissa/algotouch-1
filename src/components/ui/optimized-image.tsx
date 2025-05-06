
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  loadingClassName?: string;
}

const OptimizedImage = ({
  src,
  alt,
  fallbackSrc = '/placeholder.svg',
  className,
  loadingClassName,
  ...props
}: OptimizedImageProps) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(false);
    
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setImgSrc(src);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setImgSrc(fallbackSrc);
      setError(true);
      setIsLoading(false);
    };
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, fallbackSrc]);

  return (
    <img
      src={imgSrc || fallbackSrc}
      alt={alt}
      className={cn(
        isLoading && loadingClassName,
        isLoading && 'animate-pulse bg-muted/30',
        className
      )}
      loading="lazy"
      {...props}
      onError={() => {
        setImgSrc(fallbackSrc);
        setError(true);
      }}
    />
  );
};

export default OptimizedImage;
