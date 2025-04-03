
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Module {
  title: string;
  duration?: string;
  details?: string;
  isNew?: boolean;
}

interface CourseModuleListProps {
  modules: Module[];
  completedModules?: string[];
}

const CourseModuleList = ({ modules, completedModules = [] }: CourseModuleListProps) => {
  return (
    <Card className="bg-card/80 backdrop-blur-sm border">
      <CardHeader>
        <CardTitle className="text-xl">מודולים</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {modules.map((module, index) => {
            const isCompleted = completedModules.includes(index.toString());
            
            return (
              <div key={index} className="group">
                <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className={`mt-0.5 size-6 rounded-full ${isCompleted ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary'} flex items-center justify-center text-xs font-medium flex-shrink-0`}>
                    {isCompleted ? <CheckCircle2 className="size-4" /> : index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium group-hover:text-primary transition-colors">
                      {module.title}
                      {module.isNew && (
                        <span className="mr-2 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-semibold">
                          חדש
                        </span>
                      )}
                      {isCompleted && (
                        <span className="mr-2 bg-green-100 text-green-600 px-1.5 py-0.5 rounded text-xs font-semibold">
                          הושלם
                        </span>
                      )}
                    </h3>
                    {module.duration && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="size-3.5" />
                        {module.duration}
                      </div>
                    )}
                    {module.details && <p className="text-sm text-muted-foreground mt-1">{module.details}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseModuleList;
