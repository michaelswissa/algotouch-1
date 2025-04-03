import {
  BarChart3,
  BookOpen,
  Bot,
  Calendar,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LineChart,
  LogOut,
  Newspaper,
  Settings,
  User,
  Users,
  UsersRound
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth";
import { useAdmin } from "@/contexts/admin";
import clsx from "clsx";
import { APP_VERSION } from "@/config";
import { useSidebar } from "@/contexts/sidebar";

export default function Sidebar() {
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { isSidebarOpen } = useSidebar();

  return (
    <div className={clsx("fixed right-0 top-16 bottom-0 z-40 w-64 overflow-y-auto border-l bg-background transition-transform sm:translate-x-0", 
      !isSidebarOpen && 'translate-x-full')}>

      <div className="flex h-full flex-col gap-2 p-4">
        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="px-3 py-2">
              <h2 className="mb-2 text-lg font-semibold tracking-tight">
                ניהול מערכת
              </h2>
              <div className="space-y-1">
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <NavLink to="/admin" className={({ isActive }) => 
                    clsx("flex items-center gap-2", isActive && "bg-accent text-accent-foreground")}>
                    <Users className="h-4 w-4" />
                    <span>משתמשים</span>
                  </NavLink>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <NavLink to="/admin/reports" className={({ isActive }) => 
                    clsx("flex items-center gap-2", isActive && "bg-accent text-accent-foreground")}>
                    <Layers className="h-4 w-4" />
                    <span>דוחות מערכת</span>
                  </NavLink>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <NavLink to="/admin/settings" className={({ isActive }) => 
                    clsx("flex items-center gap-2", isActive && "bg-accent text-accent-foreground")}>
                    <Settings className="h-4 w-4" />
                    <span>הגדרות</span>
                  </NavLink>
                </Button>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Main navigation */}
        <div className="px-3 py-2">
          <h2 className="mb-2 text-lg font-semibold tracking-tight">
            ניווט ראשי
          </h2>
          <div className="space-y-1">
            <Button variant="ghost" className="w-full justify-start" asChild>
              <NavLink to="/dashboard" className={({ isActive }) => 
                clsx("flex items-center gap-2", isActive && "bg-accent text-accent-foreground")}>
                <LayoutDashboard className="h-4 w-4" />
                <span>דף הבית</span>
              </NavLink>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <NavLink to="/trades" className={({ isActive }) => 
                clsx("flex items-center gap-2", isActive && "bg-accent text-accent-foreground")}>
                <LineChart className="h-4 w-4" />
                <span>עסקאות</span>
              </NavLink>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <NavLink to="/journal" className={({ isActive }) => 
                clsx("flex items-center gap-2", isActive && "bg-accent text-accent-foreground")}>
                <BookOpen className="h-4 w-4" />
                <span>יומן מסחר</span>
              </NavLink>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <NavLink to="/reports" className={({ isActive }) => 
                clsx("flex items-center gap-2", isActive && "bg-accent text-accent-foreground")}>
                <BarChart3 className="h-4 w-4" />
                <span>דוחות וניתוח</span>
              </NavLink>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <NavLink to="/calendar" className={({ isActive }) => 
                clsx("flex items-center gap-2", isActive && "bg-accent text-accent-foreground")}>
                <Calendar className="h-4 w-4" />
                <span>יומן</span>
              </NavLink>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <NavLink to="/assistant" className={({ isActive }) => 
                clsx("flex items-center gap-2", isActive && "bg-accent text-accent-foreground")}>
                <Bot className="h-4 w-4" />
                <span>עוזר AI</span>
              </NavLink>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <NavLink to="/courses" className={({ isActive }) => 
                clsx("flex items-center gap-2", isActive && "bg-accent text-accent-foreground")}>
                <GraduationCap className="h-4 w-4" />
                <span>קורסים והדרכות</span>
              </NavLink>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <NavLink to="/community" className={({ isActive }) => 
                clsx("flex items-center gap-2", isActive && "bg-accent text-accent-foreground")}>
                <UsersRound className="h-4 w-4" />
                <span>קהילה</span>
              </NavLink>
            </Button>
          </div>
        </div>
        <Separator />
        <div className="px-3 py-2">
          <h2 className="mb-2 text-lg font-semibold tracking-tight">
            חשבון
          </h2>
          <div className="space-y-1">
            <Button variant="ghost" className="w-full justify-start" asChild>
              <NavLink to="/profile" className={({ isActive }) => 
                clsx("flex items-center gap-2", isActive && "bg-accent text-accent-foreground")}>
                <User className="h-4 w-4" />
                <span>פרופיל</span>
              </NavLink>
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
              <LogOut className="h-4 w-4 ml-2" />
              <span>התנתק</span>
            </Button>
          </div>
        </div>

        {/* Blog and content */}
        <Separator />
        <div className="px-3 py-2">
          <h2 className="mb-2 text-lg font-semibold tracking-tight">
            תוכן ומידע
          </h2>
          <div className="space-y-1">
            <Button variant="ghost" className="w-full justify-start" asChild>
              <NavLink to="/blog" className={({ isActive }) => 
                clsx("flex items-center gap-2", isActive && "bg-accent text-accent-foreground")}>
                <Newspaper className="h-4 w-4" />
                <span>בלוג ומאמרים</span>
              </NavLink>
            </Button>
          </div>
        </div>
        
        {/* Version info at bottom */}
        <div className="mt-auto px-3 py-2">
          <div className="text-xs text-muted-foreground">
            גרסה {APP_VERSION}
          </div>
        </div>
      </div>
    </div>
  );
}
