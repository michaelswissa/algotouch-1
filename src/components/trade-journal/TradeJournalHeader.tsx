
import React from 'react';
import { ScrollText, Plus, Search, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

interface TradeJournalHeaderProps {
  onNewNote: () => void;
}

const TradeJournalHeader: React.FC<TradeJournalHeaderProps> = ({ onNewNote }) => {
  const navigate = useNavigate();

  const handleNewTrade = () => {
    navigate('/new-trade');
  };

  const handleMonthlyReport = () => {
    navigate('/monthly-report');
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <ScrollText size={24} />
        </span>
        <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">יומן מסחר</span>
      </h1>
      
      <div className="flex gap-3 items-center">
        <div className="relative max-w-xs">
          <Input 
            placeholder="חיפוש עסקאות..." 
            className="pl-9 pr-4 py-2 h-9 rounded-lg bg-white/80 dark:bg-white/5"
          />
          <Search size={15} className="absolute left-3 top-2.5 text-muted-foreground/70" />
        </div>
        
        <Button 
          onClick={onNewNote}
          variant="outline"
          size="sm" 
          className="gap-2 border-border/50 hover:border-primary hover:bg-primary/5 transition-all duration-300"
        >
          <FileText size={14} />
          <span>פתק חדש</span>
        </Button>
        
        <Button 
          onClick={handleMonthlyReport}
          variant="outline"
          size="sm" 
          className="gap-2 border-border/50 hover:border-primary hover:bg-primary/5 transition-all duration-300"
        >
          <FileSpreadsheet size={14} />
          <span>דוח חודשי</span>
        </Button>
        
        <Button 
          onClick={handleNewTrade}
          size="sm" 
          className="gap-2 bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105 shadow-sm"
        >
          <Plus size={14} />
          <span>עסקה חדשה</span>
        </Button>
      </div>
    </div>
  );
};

export default TradeJournalHeader;
