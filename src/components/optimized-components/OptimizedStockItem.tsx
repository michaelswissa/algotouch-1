
import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StockItemProps {
  symbol: string;
  price: string | number;
  change: string | number;
  changePercent: string;
  isPositive: boolean;
  lastUpdated?: Date;
}

const OptimizedStockItem: React.FC<StockItemProps> = React.memo(({
  symbol,
  price,
  change,
  changePercent,
  isPositive,
  lastUpdated
}) => {
  // Memoize the change indicator to prevent unnecessary re-renders
  const ChangeIndicator = useMemo(() => {
    const IconComponent = isPositive ? ArrowUpRight : ArrowDownRight;
    const colorClass = isPositive ? 'text-tradervue-green' : 'text-tradervue-red';
    
    return (
      <div className={`flex items-center text-lg ${colorClass}`}>
        <IconComponent className="mr-1" size={20} />
        <span>{changePercent} ({change})</span>
      </div>
    );
  }, [isPositive, changePercent, change]);
  
  // Format the last updated time once when it changes
  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return '';
    return new Intl.DateTimeFormat('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(lastUpdated);
  }, [lastUpdated]);

  return (
    <Card className="hover-scale" data-testid="stock-indices-item">
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-foreground">{symbol}</h3>
            <p className="text-2xl font-medium mt-1">{price}</p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">{formattedLastUpdated}</p>
            )}
          </div>
          {ChangeIndicator}
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedStockItem.displayName = 'OptimizedStockItem';

export default OptimizedStockItem;
