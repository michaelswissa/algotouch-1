
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Play, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface CourseHeaderProps {
  title: string;
  description: string;
  instructor: string;
  progress: number;
  isAuthenticated: boolean;
  hasCourseCompletionBadge: boolean;
}

const CourseHeader = ({ 
  title, 
  description, 
  instructor, 
  progress, 
  isAuthenticated,
  hasCourseCompletionBadge
}: CourseHeaderProps) => {
  return (
    <div className="mb-4">
      <Link to="/courses" className="text-primary hover:text-primary/90 flex items-center text-sm font-medium mb-2">
        <ChevronRight className="size-4 rotate-180 mr-1" />
        חזרה לכל הקורסים
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold mb-2 text-foreground">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">מדריך:</span>
          <span className="text-sm text-muted-foreground">{instructor}</span>
        </div>
        
        <div className="sm:mr-6 flex items-center gap-2">
          <span className="text-sm font-medium">התקדמות:</span>
          <div className="w-full max-w-48 flex items-center gap-2">
            <Progress value={progress} className="h-2" />
            <span className="text-sm text-tradervue-green">{progress}%</span>
          </div>
        </div>
        
        <div className="sm:mr-auto">
          <Button className="gap-2">
            <Play className="size-4" />
            המשך ללמוד {isAuthenticated && "(+5 נקודות)"}
          </Button>
        </div>
      </div>
      
      {hasCourseCompletionBadge && (
        <div className="mt-3 bg-primary/10 text-primary px-3 py-2 rounded-md flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          <span className="text-sm font-medium">קורס הושלם! קיבלת תעודה על השלמת הקורס</span>
        </div>
      )}
    </div>
  );
};

export default CourseHeader;
