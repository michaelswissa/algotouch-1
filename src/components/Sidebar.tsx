
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  LineChart, 
  Notebook, 
  Users,
  GraduationCap,
  Search,
  FileSpreadsheet,
  Bot,
  PlusCircle,
  Sparkles
} from 'lucide-react';
import TraderVueLogo from './TraderVueLogo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const navItems = [
    { path: '/dashboard', name: 'לוח בקרה', icon: <Home size={18} /> },
    { path: '/calendar', name: 'לוח שנה', icon: <Calendar size={18} /> },
    { path: '/trades', name: 'עסקאות', icon: <LineChart size={18} /> },
    { path: '/journal', name: 'יומן', icon: <Notebook size={18} /> },
    { path: '/monthly-report', name: 'דוח חודשי', icon: <FileSpreadsheet size={18} /> },
    { path: '/community', name: 'קהילה', icon: <Users size={18} /> },
    { path: '/courses', name: 'קורסים', icon: <GraduationCap size={18} /> },
    { path: '/ai-assistant', name: 'עוזר AI', icon: <Bot size={18} /> },
  ];

  const isActive = (path: string) => {
    // Check if the current location starts with the path
    // This handles nested routes like /courses/:courseId
    return location.pathname === path || 
           (path !== '/' && location.pathname.startsWith(path));
  };

  const handleNewTrade = () => {
    navigate('/new-trade');
  };

  return (
    <div className="w-64 dark:bg-sidebar dark:text-sidebar-foreground border-l border-sidebar-border min-h-screen flex flex-col shadow-xl shadow-black/5 transition-all duration-300 relative overflow-hidden" dir="rtl">
      {/* Add subtle animation background */}
      <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none"></div>
      
      <div className="p-6 border-b border-sidebar-border flex justify-center relative z-10">
        <TraderVueLogo className="mb-2 hover-scale" />
      </div>
      
      <div className="p-4 border-b border-sidebar-border relative z-10">
        <div className="relative mb-4">
          <Input 
            type="text" 
            placeholder="חיפוש" 
            className="w-full pr-8 bg-sidebar-accent/40 border-sidebar-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300" 
          />
          <Search className="h-4 w-4 absolute top-3 right-3 text-muted-foreground" />
        </div>
        
        <Button 
          onClick={handleNewTrade} 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 group"
        >
          <PlusCircle size={16} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>עסקה חדשה</span>
          <Sparkles size={14} className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute right-4" />
        </Button>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin relative z-10">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent/50 text-sidebar-foreground transition-all duration-200 sidebar-link ${
              isActive(item.path) ? 'active bg-sidebar-accent/30 text-primary font-medium' : ''
            }`}
          >
            <span className={`ml-2 ${isActive(item.path) ? 'text-primary' : 'text-primary/70'} transition-colors duration-300`}>
              {item.icon}
            </span>
            <span>{item.name}</span>
            
            {/* Add subtle indicator for active item */}
            {isActive(item.path) && (
              <span className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary rounded-l-md"></span>
            )}
          </Link>
        ))}
      </nav>
      
      <div className="p-4 border-t border-sidebar-border text-xs text-center text-sidebar-foreground/70 relative z-10">
        <p>AlgoTouch &copy; 2025</p>
        <p className="mt-1">כל הזכויות שמורות</p>
      </div>
    </div>
  );
};

export default Sidebar;
