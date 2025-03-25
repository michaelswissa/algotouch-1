
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  BarChart2, 
  LineChart, 
  BookOpen, 
  Notebook, 
  PlusCircle, 
  Users,
  GraduationCap
} from 'lucide-react';
import TraderVueLogo from './TraderVueLogo';
import { Input } from '@/components/ui/input';

const Sidebar = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', name: 'Dashboard', icon: <Home size={18} /> },
    { path: '/calendar', name: 'Calendar', icon: <Calendar size={18} /> },
    { path: '/reports', name: 'Reports', icon: <BarChart2 size={18} /> },
    { path: '/trades', name: 'Trades', icon: <LineChart size={18} /> },
    { path: '/journal', name: 'Journal', icon: <BookOpen size={18} /> },
    { path: '/notebook', name: 'Notebook', icon: <Notebook size={18} /> },
    { path: '/new-trade', name: 'New trade', icon: <PlusCircle size={18} /> },
    { path: '/community', name: 'Community', icon: <Users size={18} /> },
    { path: '/courses', name: 'Courses', icon: <GraduationCap size={18} /> },
  ];

  return (
    <div className="w-60 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <TraderVueLogo className="mb-4" />
        <Input type="text" placeholder="Search" className="w-full" />
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`tradervue-nav-link ${
              location.pathname === item.path ? 'active' : ''
            }`}
          >
            {item.icon}
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
