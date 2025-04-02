import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, ScrollText, Users, GraduationCap, Search, FileSpreadsheet, Bot, PlusCircle, Sparkles, ChevronRight, X, Newspaper } from 'lucide-react';
import TraderVueLogo from './TraderVueLogo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = [{
    path: '/dashboard',
    name: 'לוח בקרה',
    icon: <Home size={18} />
  }, {
    path: '/calendar',
    name: 'לוח שנה',
    icon: <Calendar size={18} />
  }, {
    path: '/trade-journal',
    name: 'יומן מסחר',
    icon: <ScrollText size={18} />
  }, {
    path: '/monthly-report',
    name: 'דוח עסקאות',
    icon: <FileSpreadsheet size={18} />
  }, {
    path: '/blog',
    name: 'בלוג',
    icon: <Newspaper size={18} />
  }, {
    path: '/community',
    name: 'קהילה',
    icon: <Users size={18} />
  }, {
    path: '/courses',
    name: 'קורסים',
    icon: <GraduationCap size={18} />
  }, {
    path: '/ai-assistant',
    name: 'עוזר AI',
    icon: <Bot size={18} />
  }];
  const isActive = (path: string) => {
    return location.pathname === path || path !== '/' && location.pathname.startsWith(path);
  };
  const handleNewTrade = () => {
    navigate('/new-trade');
  };
  return <div className={cn("dark:bg-sidebar dark:text-sidebar-foreground border-l border-sidebar-border min-h-screen flex flex-col shadow-lg shadow-primary/10 transition-all duration-300 relative overflow-hidden", collapsed ? "w-16" : "w-64")} dir="rtl">
      <Button variant="ghost" size="icon" className="absolute top-3 left-3 z-20 h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-muted-foreground" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <ChevronRight size={14} /> : <X size={14} />}
      </Button>
      
      <div className="absolute inset-0 bg-mesh opacity-5 pointer-events-none"></div>
      
      <div className={cn("p-6 border-b border-sidebar-border flex justify-center relative z-10", collapsed && "p-3")}>
        <TraderVueLogo className="mb-2 hover-scale" collapsed={collapsed} />
      </div>
      
      <div className={cn("p-4 border-b border-sidebar-border relative z-10", collapsed && "p-2")}>
        {!collapsed && <div className="relative mb-4">
            <Input type="text" placeholder="חיפוש" className="w-full pr-8 bg-sidebar-accent/10 border-sidebar-border/50 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-300" />
            <Search className="h-4 w-4 absolute top-3 right-3 text-muted-foreground" />
          </div>}
        
        <Button onClick={handleNewTrade} className={cn("bg-gradient-to-r from-primary/90 to-primary/70 text-white flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.03] group", collapsed ? "w-10 h-10 p-0 rounded-full mx-auto" : "w-full")}>
          <PlusCircle size={16} className="group-hover:rotate-90 transition-transform duration-300" />
          {!collapsed && <span>עסקה חדשה</span>}
          {!collapsed && <Sparkles size={14} className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute right-4" />}
        </Button>
      </div>
      
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin relative z-10">
        {navItems.map(item => <Link key={item.path} to={item.path} className={cn("flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent/15 text-sidebar-foreground transition-all duration-200 sidebar-link", isActive(item.path) && "active bg-sidebar-accent/10 text-primary font-medium", collapsed && "justify-center px-2")}>
            <span className={cn("transition-colors duration-300", isActive(item.path) ? "text-primary" : "text-primary/60")}>
              {item.icon}
            </span>
            {!collapsed && <span>{item.name}</span>}
            
            {isActive(item.path) && <span className={cn("absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary/80 rounded-l-md", collapsed && "w-1 right-0")}></span>}
          </Link>)}
      </nav>
      
      <div className={cn("p-4 border-t border-sidebar-border text-xs text-center text-sidebar-foreground/60 relative z-10", collapsed && "p-2")}>
        {!collapsed ? <div className="text-center">
            <p className="text-center">AlgoTouch &copy; 2025</p>
            <p className="mt-1 text-center">כל הזכויות שמורות</p>
          </div> : <div className="text-center">
            <span>&copy;</span>
          </div>}
      </div>
    </div>;
};
export default Sidebar;