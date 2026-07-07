'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  BrainCircuit,
  LayoutDashboard,
  Users,
  Sparkles,
  FileText,
  ClipboardCheck,
  TrendingUp,
  Award,
  Shield,
  LogOut,
  MessageCircle,
  Bell,
  CheckSquare,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  unreadCount?: number;
}

interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  restricted?: boolean;
  badge?: string;
}

const navItems: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agent', label: 'AI Agent', icon: MessageCircle, badge: 'New' },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'onboarding', label: 'AI Onboarding', icon: Sparkles },
  { id: 'rag', label: 'Documents', icon: FileText },
  { id: 'assessments', label: 'Assessments', icon: ClipboardCheck },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'admin', label: 'Admin Panel', icon: Shield, restricted: true },
];

function SidebarContent({
  activeView,
  onNavigate,
  user,
  logout,
  onNavigateAndClose,
  unreadCount = 0,
}: {
  activeView: string;
  onNavigate: (view: string) => void;
  user: { name: string; email: string; role: string } | null;
  logout: () => void;
  onNavigateAndClose?: (view: string) => void;
  unreadCount?: number;
}) {
  const isAdminOrHr = user?.role === 'admin' || user?.role === 'hr';

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const handleNavClick = (viewId: string) => {
    if (onNavigateAndClose) {
      onNavigateAndClose(viewId);
    } else {
      onNavigate(viewId);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Aurora gradient line on the right edge */}
      <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent" />

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <motion.div
          whileHover={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.5 }}
          className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.55_0.2_270)] to-[oklch(0.5_0.22_310)] text-white shadow-lg shadow-[oklch(0.55_0.2_270/0.2)] shrink-0"
        >
          <BrainCircuit className="h-5 w-5" />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
        </motion.div>
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-bold text-lg tracking-tight whitespace-nowrap"
        >
          <span className="gradient-text">Onboard</span>
          <span className="text-foreground">AI</span>
        </motion.span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="space-y-0.5" role="navigation" aria-label="Main navigation">
          <TooltipProvider delayDuration={0}>
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              const Icon = item.icon;
              const isHidden = item.restricted && !isAdminOrHr;
              const showBadge = item.id === 'notifications' && unreadCount > 0;

              if (isHidden) return null;

              const button = (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    'w-full justify-start gap-3 h-10 px-3 rounded-xl transition-all duration-300 relative group',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-bg"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/8 to-primary/4"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon className="h-[18px] w-[18px] shrink-0 relative z-10" />
                  <span className="text-sm relative z-10">{item.label}</span>
                  {showBadge && (
                    <span className="ml-auto relative z-10 flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-gradient-to-r from-[oklch(0.55_0.2_270)] to-[oklch(0.5_0.22_310)] text-white text-[10px] font-bold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {item.badge && !showBadge && (
                    <span className="ml-auto relative z-10 text-[9px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-semibold">
                      {item.badge}
                    </span>
                  )}
                </Button>
              );

              return button;
            })}
          </TooltipProvider>
        </nav>
      </ScrollArea>

      {/* User section at bottom */}
      <div className="mt-auto p-3">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-muted/30 border border-border/30">
          <div className="relative">
            <Avatar className="h-9 w-9 ring-2 ring-primary/20 ring-offset-1 ring-offset-background">
              <AvatarFallback className="bg-gradient-to-br from-[oklch(0.55_0.2_270/0.1)] to-[oklch(0.5_0.22_310/0.1)] text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[oklch(0.65_0.18_160)] border-2 border-background" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-muted-foreground capitalize truncate">{user?.role || 'guest'}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full justify-start gap-3 h-10 px-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-200 mt-1"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <span className="text-sm">Log out</span>
        </Button>
      </div>
    </div>
  );
}

export default function Sidebar({ activeView, onNavigate, unreadCount }: SidebarProps) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleMobileNavigate = (view: string) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile sidebar using Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-3 left-3 z-50 lg:hidden glass-subtle rounded-xl shadow-lg"
            aria-label="Open navigation menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 glass-strong">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent
            activeView={activeView}
            onNavigate={onNavigate}
            user={user}
            logout={logout}
            onNavigateAndClose={handleMobileNavigate}
            unreadCount={unreadCount}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 w-[260px] glass-strong sidebar-glow shrink-0">
        <SidebarContent
          activeView={activeView}
          onNavigate={onNavigate}
          user={user}
          logout={logout}
          unreadCount={unreadCount}
        />
      </aside>
    </>
  );
}