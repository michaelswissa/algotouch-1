
import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// Note data structure
interface TradeNote {
  id: number;
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
}

interface TradeNotesProps {
  notes: TradeNote[];
}

const TradeNotes: React.FC<TradeNotesProps> = ({ notes }) => {
  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          <span>פתקים והערות</span>
        </h2>
      </div>
      
      <ScrollArea className="w-full" dir="rtl">
        <div className="flex space-x-reverse space-x-4 pb-4 rtl">
          {notes.map((note) => (
            <Card key={note.id} className="inline-block w-[300px] shrink-0 hover-scale hover-glow">
              <CardContent className="p-4">
                <div className="flex items-start gap-2 mb-2">
                  <FileText size={16} className="text-primary mt-0.5" />
                  <div className="rtl text-right">
                    <h3 className="font-medium whitespace-normal">{note.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{note.date}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-normal line-clamp-2 mb-3 text-right">
                  {note.excerpt}
                </p>
                <div className="flex flex-wrap gap-1 mt-2 justify-end">
                  {note.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="bg-secondary/30 border-border/50 text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TradeNotes;
