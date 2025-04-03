
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface Resource {
  id: number;
  title: string;
  type: string;
  size: string;
}

interface CourseResourceListProps {
  resources: Resource[];
}

const CourseResourceList = ({ resources }: CourseResourceListProps) => {
  return (
    <Card className="bg-card/80 backdrop-blur-sm border">
      <CardHeader>
        <CardTitle className="text-xl">חומרים להורדה</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {resources.map(resource => (
            <div key={resource.id} className="p-3 border rounded-lg flex items-center gap-3 hover:bg-muted/50 transition-colors">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <FileText className="size-5 text-primary" />
              </div>
              <div className="flex-grow">
                <h3 className="font-medium">{resource.title}</h3>
                <div className="text-sm text-muted-foreground mt-1">
                  {resource.size}
                </div>
              </div>
              <Button size="sm" variant="outline" className="flex-shrink-0">
                הורדה
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseResourceList;
