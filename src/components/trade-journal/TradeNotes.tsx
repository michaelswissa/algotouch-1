
import React, { useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

// Updated note data structure for reports
interface TradeNote {
  id: number;
  date: string;
  emotional: {
    state: string;
  };
  confidence: {
    level: number;
  };
  intervention: {
    level: string;
    reasons: string[];
  };
  insight?: string;
}

interface TradeNotesProps {
  notes: TradeNote[];
  onDeleteNote?: (noteId: number) => void;
}

const TradeNotes: React.FC<TradeNotesProps> = ({ notes, onDeleteNote }) => {
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Helper function to get a summary based on the report data
  const getReportSummary = (note: TradeNote) => {
    let summary = '';
    
    // Add a summary based on confidence level
    if (note.confidence.level >= 4) {
      summary = 'יום מסחר עם ביטחון גבוה';
    } else if (note.confidence.level <= 2) {
      summary = 'יום מסחר עם חששות';
    } else {
      summary = 'יום מסחר עם ביטחון בינוני';
    }
    
    return summary;
  };
  
  // Helper function to get tags based on the report data
  const getReportTags = (note: TradeNote) => {
    const tags: string[] = [];
    
    // Add tags based on emotional state
    if (note.emotional.state === '😀' || note.emotional.state === '😌') {
      tags.push('מצב רוח חיובי');
    } else if (note.emotional.state === '😕' || note.emotional.state === '😣') {
      tags.push('מצב רוח מאתגר');
    } else {
      tags.push('מצב רוח ניטרלי');
    }
    
    // Add tag based on intervention
    if (note.intervention.level === 'intervened') {
      tags.push('התערבתי באלגו');
    } else if (note.intervention.level === 'wanted') {
      tags.push('רציתי להתערב');
    } else {
      tags.push('ללא התערבות');
    }
    
    return tags;
  };

  const handleDeleteClick = (id: number) => {
    setNoteToDelete(id);
  };

  const confirmDelete = () => {
    if (noteToDelete !== null && onDeleteNote) {
      onDeleteNote(noteToDelete);
      toast({
        title: "נמחק בהצלחה",
        description: "הדוח היומי נמחק מההיסטוריה",
      });
    }
    setNoteToDelete(null);
  };

  const cancelDelete = () => {
    setNoteToDelete(null);
  };
  
  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          <span>דוחות יומיים</span>
        </h2>
      </div>
      
      <ScrollArea className="w-full" dir="rtl">
        <div className="flex space-x-reverse space-x-4 pb-4 rtl">
          {notes.length > 0 ? (
            notes.map((note) => (
              <Card key={note.id} className="inline-block w-[300px] shrink-0 hover-scale hover-glow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive ml-auto"
                      onClick={() => handleDeleteClick(note.id)}
                    >
                      <Trash2 size={16} />
                      <span className="sr-only">מחק דוח</span>
                    </Button>
                    <div className="flex items-start gap-2">
                      <FileText size={16} className="text-primary mt-0.5" />
                      <div className="rtl text-right">
                        <h3 className="font-medium whitespace-normal">דוח יומי</h3>
                        <p className="text-xs text-muted-foreground mt-1">{note.date}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{note.emotional.state}</span>
                    <span className="text-sm text-muted-foreground">
                      ביטחון: {note.confidence.level}/5
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground whitespace-normal line-clamp-2 mb-3 text-right">
                    {note.insight || getReportSummary(note)}
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mt-2 justify-end">
                    {getReportTags(note).map((tag, index) => (
                      <Badge key={index} variant="outline" className="bg-secondary/30 border-border/50 text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="w-full text-center p-8 text-muted-foreground">
              <p>עדיין אין דוחות שמורים. מלא את השאלון היומי כדי ליצור את הדוח הראשון.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Confirmation Dialog */}
      <AlertDialog open={noteToDelete !== null} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח שברצונך למחוק?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הדוח היומי לצמיתות ולא ניתן יהיה לשחזר אותו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse sm:justify-start">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TradeNotes;
