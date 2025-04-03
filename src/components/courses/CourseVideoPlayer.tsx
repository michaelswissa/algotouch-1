
import React from 'react';
import { Button } from "@/components/ui/button";
import { Clock, Volume2 } from "lucide-react";

interface CourseVideoPlayerProps {
  videoUrl: string;
  videoTitle: string;
  duration?: string;
  onEnded: () => void;
}

const CourseVideoPlayer = ({ videoUrl, videoTitle, duration, onEnded }: CourseVideoPlayerProps) => {
  return (
    <div className="mb-6 bg-background/40 rounded-xl overflow-hidden shadow-lg border border-primary/10">
      <div className="relative pt-[56.25%] w-full overflow-hidden">
        <iframe 
          className="absolute top-0 left-0 w-full h-full"
          src={videoUrl}
          title={videoTitle}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onEnded={onEnded}
        ></iframe>
      </div>
      <div className="p-4 flex justify-between items-center bg-card/80 backdrop-blur-sm border-t">
        <div className="flex-1">
          <h3 className="font-medium text-lg">{videoTitle}</h3>
          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Clock className="size-3.5" />
            <span>{duration}</span>
            <div className="flex items-center gap-1 mr-4">
              <Volume2 className="size-3.5" />
              <span>100%</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs">
            הורד
          </Button>
          <Button size="sm" className="text-xs">
            שתף
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CourseVideoPlayer;
