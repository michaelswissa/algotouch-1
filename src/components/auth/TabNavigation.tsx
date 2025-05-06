
import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TabNavigationProps {
  activeTab: 'login' | 'signup';
  onTabChange: (value: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="relative w-full max-w-xs mx-auto mt-2">
      <TabsList className="grid grid-cols-2 w-full rounded-full border border-border/20 p-1 bg-muted/30 backdrop-blur-md overflow-hidden rtl-tabs-list">
        <TabsTrigger 
          value="login" 
          className="rounded-full py-1.5 px-3 relative z-10 transition-colors duration-300 data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground/70 hover:text-foreground"
        >
          התחברות
        </TabsTrigger>
        <TabsTrigger 
          value="signup" 
          className="rounded-full py-1.5 px-3 relative z-10 transition-colors duration-300 data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground/70 hover:text-foreground"
        >
          הרשמה
        </TabsTrigger>
        
        {/* RTL-friendly tab indicator */}
        <div 
          className="absolute inset-y-1 rounded-full bg-primary transition-all duration-300 ease-in-out z-0"
          style={{ 
            width: '50%', 
            right: activeTab === 'login' ? '50%' : '0%' 
          }}
        />
      </TabsList>
    </div>
  );
};

export default TabNavigation;
