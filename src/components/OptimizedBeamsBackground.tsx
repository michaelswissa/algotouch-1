
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface BeamsBackgroundProps {
  className?: string;
  intensity?: 'light' | 'medium' | 'strong';
  animate?: boolean;
}

const OptimizedBeamsBackground = ({ 
  className,
  intensity = 'medium',
  animate = true
}: BeamsBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const intensityMap = {
    light: 0.3,
    medium: 0.5,
    strong: 0.7
  };
  
  const opacityLevel = intensityMap[intensity];
  
  // Use requestAnimationFrame for better performance
  useEffect(() => {
    if (!animate) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    // Set canvas size initially and on resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    let startTime = Date.now();
    
    const renderFrame = () => {
      if (!ctx || !canvas) return;
      
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      
      // Draw beams
      const numBeams = 3;
      for (let i = 0; i < numBeams; i++) {
        const hue = (elapsed * 10 + i * 120) % 360;
        const gradientOpacity = opacityLevel;
        
        const gradient = ctx.createRadialGradient(
          canvas.width * (0.3 + Math.sin(elapsed * 0.2 + i) * 0.2),
          canvas.height * (0.4 + Math.cos(elapsed * 0.3 + i) * 0.3),
          0,
          canvas.width * (0.5 + Math.cos(elapsed * 0.4 + i) * 0.2),
          canvas.height * (0.6 + Math.sin(elapsed * 0.5 + i) * 0.3),
          canvas.width * 0.8
        );
        
        gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${gradientOpacity})`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(
          canvas.width * (0.5 + Math.sin(elapsed * 0.3 + i) * 0.2),
          canvas.height * (0.5 + Math.cos(elapsed * 0.4 + i) * 0.3),
          canvas.width * 0.8,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      
      requestRef.current = requestAnimationFrame(renderFrame);
    };
    
    requestRef.current = requestAnimationFrame(renderFrame);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate, opacityLevel]);
  
  return (
    <div className={cn("fixed inset-0 z-[-1] overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-80"
      />
    </div>
  );
};

export default OptimizedBeamsBackground;
