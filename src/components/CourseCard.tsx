
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { GraduationCap, BookOpen, Play, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ModuleProps {
  title: string;
  duration?: string;
  isNew?: boolean;
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
    <Card className={`hover:shadow-md transition-all ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <div className="p-2 rounded-full bg-blue-100">{renderIcon()}</div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4 text-sm">{description}</p>
        <div className="space-y-2">
          {modules.slice(0, 4).map((module, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <ArrowLeft className="h-3 w-3 text-gray-400" />
              <span className="text-gray-700">{module.title}</span>
              {module.duration && <span className="text-gray-500 text-xs">{module.duration}</span>}
              {module.isNew && <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200 mr-auto">חדש</Badge>}
            </div>
          ))}
          {modules.length > 4 && (
            <div className="text-sm text-gray-500 pt-1">
              ועוד {modules.length - 4} מודולים...
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={onClick}
        >
          {isSelected ? 'כעת נצפה' : 'צפה בקורס'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CourseCard;
