
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle2, Clock } from "lucide-react";

interface Lesson {
  id: number;
  title: string;
  duration?: string;
  completed?: boolean;
  content?: string;
  videoUrl?: string;
}

interface CourseLessonListProps {
  lessons: Lesson[];
  activeVideoId: number | null;
  watchedLessons?: string[];
  onLessonClick: (lessonId: number) => void;
}

const CourseLessonList = ({ 
  lessons, 
  activeVideoId, 
  watchedLessons = [], 
  onLessonClick 
}: CourseLessonListProps) => {
  return (
    <Card className="bg-card/80 backdrop-blur-sm border">
      <CardHeader>
        <CardTitle className="text-xl">שיעורים אחרונים</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {lessons.map(lesson => {
            const isWatched = watchedLessons.includes(lesson.id.toString()) || lesson.completed;
            
            return (
              <div 
                key={lesson.id} 
                className={`p-3 border rounded-lg flex items-center gap-3 hover:bg-muted/50 transition-colors cursor-pointer
                        ${activeVideoId === lesson.id ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => onLessonClick(lesson.id)}
              >
                <Button size="icon" variant={activeVideoId === lesson.id ? "default" : "secondary"} className="size-10 rounded-full flex-shrink-0">
                  <Play className="size-5" />
                </Button>
                <div className="flex-grow">
                  <h3 className="font-medium">{lesson.title}</h3>
                  {lesson.duration && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="size-3.5" />
                      {lesson.duration}
                    </div>
                  )}
                </div>
                {isWatched ? (
                  <CheckCircle2 className="size-5 text-tradervue-green flex-shrink-0" />
                ) : (
                  <Button size="sm" variant="ghost" className="flex-shrink-0">
                    המשך
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseLessonList;
