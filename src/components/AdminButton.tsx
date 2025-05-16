
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

const AdminButton = () => {
  return (
    <Link to="/admin">
      <Button variant="outline" size="sm" className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4" />
        כלי ניהול
      </Button>
    </Link>
  );
};

export default AdminButton;
