
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { GraduationCap, BookOpen, Play, ArrowLeft, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ModuleProps {
  title: string;
  duration?: string;
  isNew?: boolean;
  details?: string;
}

export interface CourseProps {
  title: string;
  description: string;
  icon: "graduation" | "book" | "play";
  id?: string;
  modules: ModuleProps[];
  isSelected?: boolean;
  onClick?: () => void;
}

const CourseCard = ({ title, description, icon, modules, isSelected, onClick }: CourseProps) => {
  // Render the appropriate icon based on the icon prop
  const renderIcon = () => {
    switch (icon) {
      case "graduation":
        return <GraduationCap className="h-5 w-5 text-blue-500" />;
      case "book":
        return <BookOpen className="h-5 w-5 text-green-500" />;
      case "play":
        return <Play className="h-5 w-5 text-purple-500" />;
      default:
        return <GraduationCap className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <Card 
      className={`glass-card-2025 hover:shadow-lg transition-all duration-300 overflow-hidden
      ${isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:border-primary/30'}`} 
      dir="rtl"
    >
      {/* Course thumbnail - visually appealing video preview */}
      <div className="relative w-full h-40 bg-secondary/40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80 z-10"></div>
        <div className="h-full w-full bg-gradient-to-r from-primary/5 to-secondary/20 flex items-center justify-center">
          <div className="bg-primary/90 rounded-full p-3 shadow-lg pulse-subtle z-20">
            <Play className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md z-20 backdrop-blur-sm">
          5 שיעורים
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10 text-primary">{renderIcon()}</div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">{description}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2.5">
          {modules.slice(0, 3).map((module, i) => (
            <div key={i} className="flex items-center gap-2 text-sm bg-secondary/40 p-2 rounded-md hover:bg-secondary/60 transition-colors">
              <Video className="h-3.5 w-3.5 text-primary/80 flex-shrink-0" />
              <span className="font-medium">{module.title}</span>
              {module.duration && <span className="text-xs text-muted-foreground mr-auto">{module.duration}</span>}
              {module.isNew && <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200 ml-auto">חדש</Badge>}
            </div>
          ))}
          {modules.length > 3 && (
            <div className="text-sm text-muted-foreground pt-1 text-center">
              ועוד {modules.length - 3} מודולים נוספים...
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          variant={isSelected ? "default" : "outline"} 
          className="w-full gap-2 group"
          onClick={onClick}
        >
          {isSelected ? 'כעת נצפה' : 'צפה בקורס'}
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CourseCard;
