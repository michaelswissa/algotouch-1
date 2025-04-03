
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  onChange: (value: string) => void;
  value?: string;
  height?: number;
  width?: number;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ 
  onChange,
  value,
  height = 200,
  width = 500
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas size to match the displayed size to prevent scaling issues
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    // Scale the context to account for the device pixel ratio
    context.scale(dpr, dpr);
    
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#000000';
    setCtx(context);
    
    // Clear canvas
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

  const getCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in event) {
      // Touch event
      return {
        x: (event.touches[0].clientX - rect.left),
        y: (event.touches[0].clientY - rect.top)
      };
    } else {
      // Mouse event
      return {
        x: (event.clientX - rect.left),
        y: (event.clientY - rect.top)
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctx || !canvasRef.current) return;
    
    setIsDrawing(true);
    setHasSignature(true);
    
    const coords = getCoordinates(e, canvasRef.current);
    
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx || !canvasRef.current) return;
    
    if ('touches' in e) {
      e.preventDefault(); // Prevent scrolling when drawing
    }
    
    const coords = getCoordinates(e, canvasRef.current);
    
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing || !ctx) return;
    
    ctx.closePath();
    setIsDrawing(false);
    
    // Convert to data URL and update the value
    if (canvasRef.current) {
      const dataURL = canvasRef.current.toDataURL('image/png');
      onChange(dataURL);
    }
  };

  const clearSignature = () => {
    if (!ctx || !canvasRef.current) return;
    
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSignature(false);
    onChange('');
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="border rounded-md overflow-hidden bg-[#f8f8f8] dark:bg-slate-900" style={{ width, height }}>
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
      <div className="flex justify-end">
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
    </div>
  );
};

export default SignaturePad;
