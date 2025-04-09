
import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Loader2 } from "lucide-react";

const CANCELLATION_REASONS = [
  { id: 'too_expensive', label: 'המחיר גבוה מדי' },
  { id: 'not_useful', label: 'לא מוצא מספיק שימוש במערכת' },
  { id: 'missing_features', label: 'חסרים פיצ׳רים שחשובים לי' },
  { id: 'found_alternative', label: 'מצאתי פתרון חלופי' },
  { id: 'temporary_break', label: 'הפסקה זמנית, אחזור בעתיד' },
  { id: 'other', label: 'סיבה אחרת' },
];

interface CancellationSurveyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: (reason: string, feedback: string) => Promise<void>;
  isProcessing: boolean;
}

const CancellationSurvey = ({ 
  open, 
  onOpenChange, 
  onCancel, 
  isProcessing 
}: CancellationSurveyProps) => {
  const [reason, setReason] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');

  const handleCancelSubmit = async () => {
    await onCancel(reason, feedback);
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing if we're not processing
    if (!isProcessing) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>ביטול מנוי</DialogTitle>
          <DialogDescription>
            נשמח לדעת למה החלטת לבטל את המנוי, כדי שנוכל להשתפר.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
            {CANCELLATION_REASONS.map((item) => (
              <div key={item.id} className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value={item.id} id={item.id} />
                <Label htmlFor={item.id} className="mr-2">{item.label}</Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="feedback">משוב נוסף (אופציונלי)</Label>
            <Textarea
              id="feedback"
              placeholder="אנא שתף איתנו מה יגרום לך לחזור בעתיד"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between flex-row-reverse">
          <Button
            onClick={handleCancelSubmit}
            disabled={isProcessing || !reason}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                מבטל מנוי...
              </>
            ) : (
              'ביטול המנוי'
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            חזרה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancellationSurvey;
