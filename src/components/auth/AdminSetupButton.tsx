
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createAdminUser } from '@/lib/admin-setup';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const AdminSetupButton = () => {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateAdmin = async () => {
    try {
      setIsCreating(true);
      const result = await createAdminUser();
      
      if (result.success) {
        toast.success('משתמש מנהל נוצר בהצלחה!');
      } else {
        toast.error(`שגיאה ביצירת משתמש מנהל: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error('שגיאה בלתי צפויה ביצירת משתמש מנהל');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mt-6 text-center">
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleCreateAdmin}
        disabled={isCreating}
      >
        {isCreating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            יוצר משתמש מנהל...
          </>
        ) : (
          'צור משתמש מנהל'
        )}
      </Button>
    </div>
  );
};

export default AdminSetupButton;
