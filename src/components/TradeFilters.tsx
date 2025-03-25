
import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, Filter } from 'lucide-react';

interface TradeFiltersProps {
  symbol?: string;
  onSymbolChange?: (value: string) => void;
  minimal?: boolean;
}

const TradeFilters = ({ symbol = 'AAPL', onSymbolChange, minimal = false }: TradeFiltersProps) => {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <div className="space-y-1">
        <label className="text-xs text-gray-500">סמל</label>
        <input 
          type="text" 
          value={symbol}
          onChange={(e) => onSymbolChange?.(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-md text-sm w-28" 
        />
      </div>
      
      <div className="space-y-1">
        <label className="text-xs text-gray-500">תגיות</label>
        <Select defaultValue="3-selected">
          <SelectTrigger className="w-36 py-1.5 h-auto">
            <SelectValue placeholder="בחר תגיות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3-selected">3 נבחרו</SelectItem>
            <SelectItem value="momentum">מומנטום</SelectItem>
            <SelectItem value="swing">סווינג</SelectItem>
            <SelectItem value="day-trade">דיי טרייד</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-1">
        <label className="text-xs text-gray-500">כיוון</label>
        <Select defaultValue="long">
          <SelectTrigger className="w-28 py-1.5 h-auto">
            <SelectValue placeholder="כיוון" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="long">Long</SelectItem>
            <SelectItem value="short">Short</SelectItem>
            <SelectItem value="all">הכל</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!minimal && (
        <div className="space-y-1">
          <label className="text-xs text-gray-500">משך</label>
          <Select defaultValue="all">
            <SelectTrigger className="w-28 py-1.5 h-auto">
              <SelectValue placeholder="משך" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="day">יום</SelectItem>
              <SelectItem value="swing">סווינג</SelectItem>
              <SelectItem value="position">פוזיציה</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs text-gray-500 invisible">תאריך</label>
        <Button variant="outline" size="sm" className="h-[34px] gap-2">
          <Calendar size={14} />
          <span>6 ינו' - 6 פבר'</span>
        </Button>
      </div>

      {!minimal && (
        <div className="space-y-1">
          <label className="text-xs text-gray-500 invisible">מתקדם</label>
          <Button variant="outline" size="sm" className="h-[34px]">
            <Filter size={14} className="ml-2" />
            מתקדם
          </Button>
        </div>
      )}

      {!minimal && (
        <div className="space-y-1">
          <label className="text-xs text-gray-500 invisible">נקה</label>
          <Button variant="outline" size="sm" className="h-[34px]">
            נקה
          </Button>
        </div>
      )}
    </div>
  );
};

export default TradeFilters;
