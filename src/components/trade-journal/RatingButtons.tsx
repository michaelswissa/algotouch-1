
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface RatingButtonsProps {
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
    tooltip?: string;
    icon?: React.ReactNode;
  }[];
  className?: string;
  showNotesForValues?: string[];
  notesValue?: string;
  onNotesChange?: (notes: string) => void;
  notesPlaceholder?: string;
  notesTitle?: string;
  notesDescription?: string;
}

const RatingButtons: React.FC<RatingButtonsProps> = ({ 
  value, 
  onChange, 
  options,
  className,
  showNotesForValues = [],
  notesValue = '',
  onNotesChange,
  notesPlaceholder = 'הוסף הערות כאן...',
  notesTitle = 'הערות נוספות',
  notesDescription = 'אנא הוסף פרטים על ההרגשה שלך'
}) => {
  const [notesOpen, setNotesOpen] = React.useState(false);
  
  // Check if we should show notes dialog after selecting certain values
  React.useEffect(() => {
    if (showNotesForValues.includes(value) && onNotesChange) {
      setNotesOpen(true);
    }
  }, [value, showNotesForValues, onNotesChange]);

  return (
    <>
      <div className={cn("flex flex-wrap gap-2 justify-between", className)}>
        {options.map((option) => (
          <TooltipProvider key={option.value}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={value === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onChange(option.value)}
                  className={cn(
                    "flex-1 transition-all duration-200 hover:scale-105",
                    value === option.value && "bg-primary text-primary-foreground ring-2 ring-primary/20"
                  )}
                >
                  {option.icon && <span className="mr-1">{option.icon}</span>}
                  {option.label}
                </Button>
              </TooltipTrigger>
              {option.tooltip && (
                <TooltipContent className="bg-card">
                  <p>{option.tooltip}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Notes Dialog */}
      {onNotesChange && (
        <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{notesTitle}</DialogTitle>
              <DialogDescription>{notesDescription}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Textarea
                placeholder={notesPlaceholder}
                value={notesValue}
                onChange={(e) => onNotesChange(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setNotesOpen(false)}>שמור</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default RatingButtons;
