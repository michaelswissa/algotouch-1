
import React from 'react';
import { GraduationCap, BookOpen, PlayCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export interface CourseModule {
  title: string;
  duration?: string;
  isNew?: boolean;
}

export interface CourseProps {
  title: string;
  description: string;
  modules: CourseModule[];
  icon?: 'graduation' | 'book' | 'play';
}

const CourseCard = ({ title, description, modules, icon = 'graduation' }: CourseProps) => {
  const renderIcon = () => {
    switch (icon) {
      case 'graduation':
        return <GraduationCap className="w-8 h-8 text-[#0299FF]" />;
      case 'book':
        return <BookOpen className="w-8 h-8 text-[#0299FF]" />;
      case 'play':
        return <PlayCircle className="w-8 h-8 text-[#0299FF]" />;
      default:
        return <GraduationCap className="w-8 h-8 text-[#0299FF]" />;
    }
  };

  return (
    <div className="course-card p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {renderIcon()}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4">{description}</p>
          
          <div className="mb-4">
            <span className="text-sm font-medium text-gray-700 block mb-2">מודולים נבחרים:</span>
            <ul className="space-y-2 text-sm text-gray-600">
              {modules.slice(0, 3).map((module, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#0299FF] text-white flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="flex-1">{module.title}</span>
                  {module.duration && <span className="text-xs text-gray-500">{module.duration}</span>}
                  {module.isNew && <Badge className="bg-green-100 text-green-800 hover:bg-green-200">חדש</Badge>}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex justify-between items-center">
            <Button variant="outline" className="text-[#0299FF] border-[#0299FF] hover:bg-[#0299FF] hover:text-white">
              פרטים נוספים
            </Button>
            <span className="text-sm text-gray-500">{modules.length} מודולים</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
