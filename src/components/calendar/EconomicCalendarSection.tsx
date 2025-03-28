
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart } from 'lucide-react';

export const EconomicCalendarSection = () => {
  return (
    <div className="mt-8">
      <Card className="glass-card-2025 overflow-hidden hover-glow">
        <CardHeader className="pb-2 bg-gradient-to-r from-background to-background/50">
          <CardTitle className="text-xl flex items-center gap-2">
            <LineChart size={18} className="text-primary" />
            <span className="neon-text">אירועים כלכליים השבוע</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <div className="rounded-lg border border-border/30 shadow-inner bg-white/50 dark:bg-black/20" style={{ maxWidth: '627px', margin: '0 auto' }}>
            <div> 
              <iframe 
                src="https://sslecal2.investing.com?ecoDayBackground=%230066ff&defaultFont=%230066ff&innerBorderColor=%238e989e&borderColor=%230066ff&columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&importance=2,3&features=datepicker,timezone,timeselector,filters&countries=23,5&calType=week&timeZone=8&lang=1" 
                width="100%" 
                height="450" 
                frameBorder="0" 
                allowTransparency={true}
              ></iframe>
            </div>
            <div className="text-center py-2 px-4 text-xs text-muted-foreground">
              <span>
                Economic Calendar provided by <a href="https://www.investing.com/" rel="nofollow" target="_blank" className="text-primary hover:underline">Investing.com</a>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
