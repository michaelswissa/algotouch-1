
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface EnhancedSignaturePadProps {
  onChange: (value: string) => void;
  value?: string;
  height?: number;
  width?: number;
  maxWidth?: number;
  responsiveWidth?: boolean;
}

const EnhancedSignaturePad: React.FC<EnhancedSignaturePadProps> = ({ 
  onChange,
  value,
  height = 200,
  width = 500,
  maxWidth,
  responsiveWidth = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPoint, setLastPoint] = useState<{x: number, y: number} | null>(null);

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas dimensions and scaling
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#000000';
    setCtx(context);
    
    // Clear canvas with light background
    context.fillStyle = '#f8f8f8';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Load signature if provided
    if (value) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = value;
    }
  }, [value]);

  // Handle window resize to adjust canvas dimensions
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !ctx) return;
      
      const rect = canvas.getBoundingClientRect();
      
      // Store the current image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Resize canvas
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Restore drawing settings
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
      
      // Redraw the signature
      ctx.putImageData(imageData, 0, 0);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [ctx]);

  const getCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): {x: number, y: number} | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in event) {
      // Touch event
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top
      };
    } else {
      // Mouse event
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctx || !canvasRef.current) return;
    
    setIsDrawing(true);
    setHasSignature(true);
    
    const coords = getCoordinates(e);
    if (!coords) return;
    
    setLastPoint(coords);
    
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx || !canvasRef.current || !lastPoint) return;
    
    if ('touches' in e) {
      e.preventDefault(); // Prevent scrolling when drawing
    }
    
    const coords = getCoordinates(e);
    if (!coords) return;
    
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    
    setLastPoint(coords);
  };

  const endDrawing = () => {
    if (!isDrawing || !ctx) return;
    
    setIsDrawing(false);
    setLastPoint(null);
    
    // Convert to data URL and update the value
    if (canvasRef.current && hasSignature) {
      try {
        const dataURL = canvasRef.current.toDataURL('image/png');
        onChange(dataURL);
      } catch (error) {
        console.error('Error generating signature image:', error);
        toast.error('שגיאה ביצירת תמונת החתימה, אנא נסה שוב');
      }
    }
  };

  const clearSignature = () => {
    if (!ctx || !canvasRef.current) return;
    
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSignature(false);
    setLastPoint(null);
    onChange('');
  };

  // Apply maxWidth constraint if provided
  const containerStyle = {
    width: responsiveWidth ? '100%' : width,
    maxWidth: maxWidth,
    height
  };

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="border rounded-md overflow-hidden bg-[#f8f8f8] dark:bg-slate-900" style={containerStyle}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
            className="touch-none w-full h-full"
          />
        </div>
        <div className="flex justify-between items-center mt-3">
          <p className="text-sm text-muted-foreground">חתום כאן (השתמש בעכבר או באצבע במסך מגע)</p>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={clearSignature}
            disabled={!hasSignature}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            נקה חתימה
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedSignaturePad;
