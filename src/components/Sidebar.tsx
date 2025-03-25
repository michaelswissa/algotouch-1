
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
  FileSpreadsheet
} from 'lucide-react';
import TraderVueLogo from './TraderVueLogo';
import { Input } from '@/components/ui/input';

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
  ];

  const isActive = (path: string) => {
    // Check if the current location starts with the path
    // This handles nested routes like /courses/:courseId
    return location.pathname === path || 
           (path !== '/' && location.pathname.startsWith(path));
  };

  return (
    <div className="w-60 bg-white border-l border-gray-200 min-h-screen flex flex-col" dir="rtl">
      <div className="p-4 border-b border-gray-200">
        <TraderVueLogo className="mb-4" />
        <div className="relative">
          <Input type="text" placeholder="חיפוש" className="w-full pr-8" />
          <Search className="h-4 w-4 absolute top-3 right-3 text-gray-400" />
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700 ${
              isActive(item.path) ? 'active bg-gray-100 text-gray-900 font-medium' : ''
            }`}
          >
            <span className="ml-2">{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
