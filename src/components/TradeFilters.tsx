
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
        <label className="text-xs text-gray-500">Symbol</label>
        <input 
          type="text" 
          value={symbol}
          onChange={(e) => onSymbolChange?.(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-md text-sm w-28" 
        />
      </div>
      
      <div className="space-y-1">
        <label className="text-xs text-gray-500">Tags</label>
        <Select defaultValue="3-selected">
          <SelectTrigger className="w-36 py-1.5 h-auto">
            <SelectValue placeholder="Select Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3-selected">3 selected</SelectItem>
            <SelectItem value="momentum">Momentum</SelectItem>
            <SelectItem value="swing">Swing</SelectItem>
            <SelectItem value="day-trade">Day Trade</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-1">
        <label className="text-xs text-gray-500">Side</label>
        <Select defaultValue="long">
          <SelectTrigger className="w-28 py-1.5 h-auto">
            <SelectValue placeholder="Side" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="long">Long</SelectItem>
            <SelectItem value="short">Short</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!minimal && (
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Duration</label>
          <Select defaultValue="all">
            <SelectTrigger className="w-28 py-1.5 h-auto">
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="swing">Swing</SelectItem>
              <SelectItem value="position">Position</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs text-gray-500 invisible">Date</label>
        <Button variant="outline" size="sm" className="h-[34px] gap-2">
          <Calendar size={14} />
          <span>Jan 6 - Feb 6</span>
        </Button>
      </div>

      {!minimal && (
        <div className="space-y-1">
          <label className="text-xs text-gray-500 invisible">Advanced</label>
          <Button variant="outline" size="sm" className="h-[34px]">
            <Filter size={14} className="mr-2" />
            Advanced
          </Button>
        </div>
      )}

      {!minimal && (
        <div className="space-y-1">
          <label className="text-xs text-gray-500 invisible">Clear</label>
          <Button variant="outline" size="sm" className="h-[34px]">
            Clear
          </Button>
        </div>
      )}
    </div>
  );
};

export default TradeFilters;
