
import React, { createContext, useContext, useState } from 'react';

// Define the shape of the admin context
interface AdminContextType {
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
}

// Create context with default values
const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  setIsAdmin: () => {},
});

// Provider component
export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  return (
    <AdminContext.Provider value={{ isAdmin, setIsAdmin }}>
      {children}
    </AdminContext.Provider>
  );
};

// Custom hook for using the admin context
export const useAdmin = () => {
  const context = useContext(AdminContext);
  
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  
  return context;
};
