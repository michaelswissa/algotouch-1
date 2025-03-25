
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Trades from "./pages/Trades";
import Journal from "./pages/Journal";
import MonthlyReport from "./pages/MonthlyReport";
import Community from "./pages/Community";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import AIAssistant from "./pages/AIAssistant";
import NotFound from "./pages/NotFound";
import NewTrade from "./pages/NewTrade";

const queryClient = new QueryClient();

const App = () => {
  // Set RTL direction at the document level
  useEffect(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "he";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/monthly-report" element={<MonthlyReport />} />
            <Route path="/community" element={<Community />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:courseId" element={<CourseDetail />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/new-trade" element={<NewTrade />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
