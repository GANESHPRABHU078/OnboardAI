'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Plus,
  CheckSquare,
  Square,
  Clock,
  AlertCircle,
  Trash2,
  Edit3,
  MoreHorizontal,
  Filter,
  Calendar,
  Tag,
  ChevronDown,
  Sparkles,
  ListTodo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  tags: string[];
  assignee?: { id: string; name: string; email: string; role: string };
  createdAt: string;
}

interface TaskStats {
  todo: number;
  in_progress: number;
  review: number;
  done: number;
  total: number;
}

const priorityConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  low: { color: 'bg-muted text-muted-foreground', label: 'Low', icon: Square },
  medium: { color: 'bg-[oklch(0.65_0.18_160/0.1)] text-[oklch(0.65_0.18_160)]', label: 'Medium', icon: Clock },
  high: { color: 'bg-[oklch(0.7_0.15_45/0.1)] text-[oklch(0.7_0.15_45)]', label: 'High', icon: AlertCircle },
  urgent: { color: 'bg-red-500/10 text-red-500', label: 'Urgent', icon: AlertCircle },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  todo: { color: 'bg-muted text-muted-foreground', label: 'To Do' },
  in_progress: { color: 'bg-blue-500/10 text-blue-500', label: 'In Progress' },
  review: { color: 'bg-amber-500/10 text-amber-500', label: 'Review' },
  done: { color: 'bg-[oklch(0.65_0.18_160/0.1)] text-[oklch(0.65_0.18_160)]', label: 'Done' },
};

const typeColors: Record<string, string> = {
  onboarding: 'bg-[oklch(0.55_0.2_270/0.1)] text-[oklch(0.55_0.2_270)]',
  assessment: 'bg-[oklch(0.65_0.18_160/0.1)] text-[oklch(0.65_0.18_160)]',
  compliance: 'bg-[oklch(0.6_0.22_310/0.1)] text-[oklch(0.6_0.22_310)]',
  general: 'bg-muted text-muted-foreground',
};

export default function TaskManagement() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [stats, setStats] = useState<TaskStats>({ todo: 0, in_progress: 0, review: 0, done: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [form, setForm] = useState({ title: '', description: '', type: 'onboarding', priority: 'medium', dueDate: '', tags: '' });

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/tasks?${params}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks.map((t: TaskItem) => ({ ...t, tags: typeof t.tags === 'string' ? JSON.parse(t.tags) : t.tags })));
        setStats(data.stats);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const createTask = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          type: form.type,
          priority: form.priority,
          dueDate: form.dueDate || null,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        toast.success('Task created!');
        setDialogOpen(false);
        setForm({ title: '', description: '', type: 'onboarding', priority: 'medium', dueDate: '', tags: '' });
        fetchTasks();
      }
    } catch { toast.error('Failed to create task'); }
  };

  const updateTaskStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status }) });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status, completedAt: status === 'done' ? new Date().toISOString() : undefined } : t));
    } catch { toast.error('Failed to update task'); }
  };

  const deleteTask = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE', headers: authHeaders() });
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('Task deleted');
    } catch { toast.error('Failed to delete task'); }
  };

  const generateSampleTasks = async () => {
    const samples = [
      { title: 'Complete security training', description: 'Finish all 5 security compliance modules', type: 'compliance', priority: 'high', dueDate: new Date(Date.now() + 3 * 86400000).toISOString(), tags: 'security,training' },
      { title: 'Review company handbook', description: 'Read and acknowledge the employee handbook', type: 'onboarding', priority: 'medium', dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), tags: 'onboarding,reading' },
      { title: 'Pass IT assessment', description: 'Score 80%+ on the IT fundamentals quiz', type: 'assessment', priority: 'high', dueDate: new Date(Date.now() + 5 * 86400000).toISOString(), tags: 'assessment,IT' },
      { title: 'Set up development environment', description: 'Configure IDE, access repositories, and install required tools', type: 'onboarding', priority: 'urgent', dueDate: new Date(Date.now() + 1 * 86400000).toISOString(), tags: 'setup,engineering' },
      { title: 'Meet with manager', description: 'Schedule and complete 1-on-1 onboarding meeting with your manager', type: 'onboarding', priority: 'medium', dueDate: new Date(Date.now() + 10 * 86400000).toISOString(), tags: 'meeting,onboarding' },
      { title: 'Submit tax documents', description: 'Upload W-4 and direct deposit forms to HR portal', type: 'compliance', priority: 'low', dueDate: new Date(Date.now() + 14 * 86400000).toISOString(), tags: 'HR,compliance' },
    ];
    for (const s of samples) {
      await fetch('/api/tasks', { method: 'POST', headers: authHeaders(), body: JSON.stringify(s) });
    }
    fetchTasks();
    toast.success('Sample tasks created!');
  };

  const completionPercent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const filteredTasks = tasks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[oklch(0.55_0.2_270/0.1)]">
            <ListTodo className="h-5 w-5 text-[oklch(0.55_0.2_270)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Tasks</h2>
            <p className="text-sm text-muted-foreground">{stats.done} of {stats.total} completed</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={generateSampleTasks} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />Samples
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 btn-aurora rounded-xl">
                <span className="relative z-10 flex items-center"><Plus className="h-4 w-4" />New Task</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong rounded-2xl">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Title</label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title..." className="rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description..." rows={3} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Priority</label>
                    <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Type</label>
                    <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="assessment">Assessment</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Due Date</label>
                  <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Tags (comma-separated)</label>
                  <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. security, training" className="rounded-xl" />
                </div>
                <Button onClick={createTask} className="w-full btn-aurora rounded-xl">
                  <span className="relative z-10">{editingTask ? 'Update Task' : 'Create Task'}</span>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats + Progress */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'To Do', count: stats.todo, color: 'from-muted to-muted/50' },
          { label: 'In Progress', count: stats.in_progress, color: 'from-blue-500/10 to-blue-500/5' },
          { label: 'Review', count: stats.review, color: 'from-amber-500/10 to-amber-500/5' },
          { label: 'Done', count: stats.done, color: 'from-[oklch(0.65_0.18_160/0.1)] to-[oklch(0.65_0.18_160/0.05)]' },
        ].map((s) => (
          <div key={s.label} className={cn('rounded-xl border border-border/30 p-3 bg-gradient-to-br', s.color)}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.count}</p>
          </div>
        ))}
        <div className="rounded-xl border border-border/30 p-3 bg-gradient-to-br from-[oklch(0.55_0.2_270/0.05)] to-[oklch(0.55_0.2_270/0.02)]">
          <p className="text-xs text-muted-foreground">Progress</p>
          <p className="text-xl font-bold mt-1">{completionPercent}%</p>
          <Progress value={completionPercent} className="mt-2 h-1.5" />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 w-fit">
        {['all', 'todo', 'in_progress', 'review', 'done'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              statusFilter === s ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted/30 shimmer" />)}</div>
      ) : filteredTasks.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
            <CheckSquare className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="font-medium text-muted-foreground">No tasks yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Create a new task to get started</p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filteredTasks.map((task) => {
              const pConfig = priorityConfig[task.priority] || priorityConfig.medium;
              const sConfig = statusConfig[task.status] || statusConfig.todo;
              const isDone = task.status === 'done';

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100, height: 0, transition: { duration: 0.2 } }}
                  className={cn(
                    'group flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md',
                    isDone ? 'bg-card/30 border-border/20' : 'bg-card border-border/30 card-aurora'
                  )}
                >
                  <button
                    onClick={() => updateTaskStatus(task.id, isDone ? 'todo' : 'done')}
                    className="shrink-0 mt-0.5"
                    aria-label={isDone ? 'Mark as todo' : 'Mark as done'}
                  >
                    {isDone ? (
                      <CheckSquare className="h-5 w-5 text-[oklch(0.65_0.18_160)]" />
                    ) : (
                      <Square className="h-5 w-5 text-muted-foreground/40 hover:text-[oklch(0.55_0.2_270)] transition-colors" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('text-sm', isDone && 'line-through text-muted-foreground')}>{task.title}</p>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 border-0', pConfig.color)}>
                        {pConfig.label}
                      </Badge>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 border-0', sConfig.color)}>
                        {sConfig.label}
                      </Badge>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 border-0', typeColors[task.type] || typeColors.general)}>
                        {task.type}
                      </Badge>
                      {task.tags.length > 0 && task.tags.map((tag) => (
                        <span key={tag} className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
                          <Tag className="h-2.5 w-2.5" />{tag}
                        </span>
                      ))}
                      {task.dueDate && (
                        <span className={cn('flex items-center gap-0.5 text-[10px]', new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-muted-foreground/60')}>
                          <Calendar className="h-2.5 w-2.5" />{format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {['todo', 'in_progress', 'review', 'done'].map((s) => {
                      if (s === task.status) return null;
                      const sc = statusConfig[s];
                      return (
                        <button
                          key={s}
                          onClick={() => updateTaskStatus(task.id, s)}
                          className={cn('px-2 py-1 rounded-md text-[10px] font-medium border border-border/30 hover:bg-muted/50 transition-colors', sc.color)}
                          title={`Move to ${sc.label}`}
                        >
                          {sc.label}
                        </button>
                      );
                    })}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTask(task.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}