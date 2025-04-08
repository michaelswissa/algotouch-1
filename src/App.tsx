
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/auth";
import AppRoutes from "./AppRoutes";

// Configure with refresh on error
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60 * 1000,
    },
  },
});

const App = () => {
  // Set RTL direction and dark mode at the document level
  useEffect(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "he";
    document.documentElement.classList.add('dark');
    
    // Add transition classes to body for smoother theme transitions
    document.body.classList.add('transition-colors', 'duration-300');
    
    // Fade in the whole app
    const timer = setTimeout(() => {
      document.body.style.opacity = "1";
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner position="top-right" expand={true} closeButton toastOptions={{
              classNames: {
                toast: 'group p-4 backdrop-blur-md bg-secondary/90 dark:bg-card/90 shadow-xl',
                title: 'text-base font-semibold text-foreground',
                description: 'text-sm text-muted-foreground',
                actionButton: 'bg-primary text-primary-foreground',
                cancelButton: 'bg-secondary text-secondary-foreground',
                error: '!bg-red-500/20 border-red-500/50',
                success: '!bg-green-500/20 border-green-500/50',
              }
            }} />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
