
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle2 } from "lucide-react";

interface Quiz {
  id: number;
  title: string;
  questions: number;
  completed: boolean;
}

interface CourseQuizListProps {
  quizzes: Quiz[];
}

const CourseQuizList = ({ quizzes }: CourseQuizListProps) => {
  return (
    <Card className="bg-card/80 backdrop-blur-sm border">
      <CardHeader>
        <CardTitle className="text-xl">מבחנים</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="p-3 border rounded-lg flex items-center gap-3 hover:bg-muted/50 transition-colors">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <FileText className="size-5 text-primary" />
              </div>
              <div className="flex-grow">
                <h3 className="font-medium">{quiz.title}</h3>
                <div className="text-sm text-muted-foreground mt-1">
                  {quiz.questions} שאלות
                </div>
              </div>
              {quiz.completed ? (
                <div className="flex items-center gap-1 text-tradervue-green text-sm mr-2">
                  <CheckCircle2 className="size-4" />
                  הושלם
                </div>
              ) : (
                <Button size="sm" variant="outline" className="flex-shrink-0">
                  התחל מבחן
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseQuizList;
