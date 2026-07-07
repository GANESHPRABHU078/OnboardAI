'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

const typeIcons: Record<string, React.ElementType> = {
  info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle, reminder: Clock,
};

const typeColors: Record<string, string> = {
  info: 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/15',
  success: 'text-[oklch(0.65_0.18_160)] bg-[oklch(0.65_0.18_160/0.1)]',
  warning: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/15',
  error: 'text-red-500 bg-red-500/10 dark:bg-red-500/15',
  reminder: 'text-[oklch(0.55_0.2_270)] bg-[oklch(0.55_0.2_270/0.1)]',
};

const categoryColors: Record<string, string> = {
  onboarding: 'bg-[oklch(0.55_0.2_270/0.1)] text-[oklch(0.55_0.2_270)]',
  assessment: 'bg-[oklch(0.65_0.18_160/0.1)] text-[oklch(0.65_0.18_160)]',
  certificate: 'bg-[oklch(0.7_0.15_45/0.1)] text-[oklch(0.7_0.15_45)]',
  system: 'bg-[oklch(0.6_0.22_310/0.1)] text-[oklch(0.6_0.22_310)]',
  task: 'bg-blue-500/10 text-blue-500',
  general: 'bg-muted text-muted-foreground',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token')}` });

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filter === 'unread') params.set('unread', 'true');
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const res = await fetch(`/api/notifications?${params}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filter, typeFilter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PUT', headers: authHeaders() });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { toast.error('Failed to mark as read'); }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST', headers: authHeaders() });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch { toast.error('Failed to mark all as read'); }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE', headers: authHeaders() });
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const generateSampleNotifications = async () => {
    const samples = [
      { title: 'Welcome to OnboardAI!', message: 'Your account has been set up successfully. Start exploring the platform.', type: 'info', category: 'system' },
      { title: 'Assessment Reminder', message: 'You have a pending security assessment due tomorrow. Complete it before the deadline.', type: 'reminder', category: 'assessment' },
      { title: 'Training Module Ready', message: 'Module 3: Security Compliance has been assigned to your training plan.', type: 'success', category: 'onboarding' },
      { title: 'Certificate Approved', message: 'Your onboarding completion certificate has been approved by HR.', type: 'success', category: 'certificate' },
      { title: 'New Document Available', message: 'The updated company handbook for 2025 is now available in the Documents section.', type: 'info', category: 'system' },
      { title: 'Task Overdue', message: 'Your IT setup task is overdue by 2 days. Please complete it as soon as possible.', type: 'warning', category: 'task' },
    ];
    for (const s of samples) {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(s),
      });
    }
    fetchNotifications();
    toast.success('Sample notifications created!');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[oklch(0.55_0.2_270/0.1)]">
            <Bell className="h-5 w-5 text-[oklch(0.55_0.2_270)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Notifications</h2>
            <p className="text-sm text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={generateSampleNotifications} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />Generate Samples
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5">
              <CheckCheck className="h-3.5 w-3.5" />Mark All Read
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={fetchNotifications} className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filter === f ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? 'All' : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground ml-2" />
          {['all', 'info', 'success', 'warning', 'error', 'reminder'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-2 py-1 rounded-lg text-xs transition-all',
                typeFilter === t ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/30 shimmer" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
            <Bell className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="font-medium text-muted-foreground">No notifications</p>
          <p className="text-sm text-muted-foreground/60 mt-1">When you have notifications, they&apos;ll appear here</p>
        </motion.div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
          <AnimatePresence>
            {notifications.map((notif) => {
              const TypeIcon = typeIcons[notif.type] || Info;
              const colorClass = typeColors[notif.type] || typeColors.info;
              const catColor = categoryColors[notif.category] || categoryColors.general;

              return (
                <motion.div
                  key={notif.id}
                  variants={item}
                  layout
                  exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                  className={cn(
                    'group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md',
                    notif.isRead
                      ? 'bg-card/50 border-border/30 hover:border-border/60'
                      : 'bg-card border-primary/15 hover:border-primary/30 card-aurora'
                  )}
                >
                  {!notif.isRead && (
                    <div className="absolute top-4 left-2 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}

                  <div className={cn('p-2.5 rounded-xl shrink-0', colorClass)}>
                    <TypeIcon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm leading-snug', !notif.isRead && 'font-semibold')}>{notif.title}</p>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg"
                            onClick={() => markAsRead(notif.id)}
                            aria-label="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg"
                          onClick={() => deleteNotification(notif.id)}
                          aria-label="Delete notification"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 border-0', catColor)}>
                        {notif.category}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}