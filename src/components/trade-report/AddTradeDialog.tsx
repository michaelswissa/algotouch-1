
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface AddTradeDialogProps {
  onAddTrade: (formData: any) => void;
}

const AddTradeDialog: React.FC<AddTradeDialogProps> = ({ onAddTrade }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus size={16} />
          הוסף עסקה ידנית
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>הוספת עסקה חדשה</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract">קונטרקט</Label>
              <Input id="contract" placeholder="לדוגמה: AAPL" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signalName">שם סיגנל</Label>
              <Input id="signalName" placeholder="לדוגמה: Breakout" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="side">כיוון</Label>
              <select id="side" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm">
                <option value="Long">לונג</option>
                <option value="Short">שורט</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">מספר חשבון</Label>
              <Input id="accountNumber" placeholder="לדוגמה: 12345" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryDateTime">תאריך ושעת כניסה</Label>
              <Input id="entryDateTime" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exitDateTime">תאריך ושעת יציאה</Label>
              <Input id="exitDateTime" type="datetime-local" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryPrice">מחיר כניסה</Label>
              <Input id="entryPrice" type="number" step="0.01" placeholder="150.25" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exitPrice">מחיר יציאה</Label>
              <Input id="exitPrice" type="number" step="0.01" placeholder="155.50" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profitLoss">רווח/הפסד</Label>
              <Input id="profitLoss" type="number" step="0.01" placeholder="525.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="net">נטו</Label>
              <Input id="net" type="number" step="0.01" placeholder="500.00" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="equity">הון</Label>
            <Input id="equity" type="number" step="0.01" placeholder="10000.00" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => onAddTrade({})}>שמור עסקה</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTradeDialog;
