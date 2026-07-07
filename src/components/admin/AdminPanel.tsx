'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Plus,
  Pencil,
  Trash2,
  Building2,
  FileText,
  Users,
  ClipboardCheck,
  BarChart3,
  ScrollText,
  Save,
  Loader2,
  Shield,
  Globe,
  Database,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  TrendingUp,
  Award,
  GraduationCap,
  Bell,
  Cpu,
  HardDrive,
  Target,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '@/services/api';
import type { Department, Policy, AuditLog, SystemSetting } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ============ Chart Colors ============
const CHART_COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];

// ============ Categories ============
const POLICY_CATEGORIES = ['security', 'compliance', 'hr', 'it', 'engineering'];

const catColors: Record<string, string> = {
  security: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  compliance: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  hr: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  it: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  engineering: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  general: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
};

const actionColors: Record<string, string> = {
  login: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  create: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  update: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  delete: 'bg-red-500/10 text-red-600 dark:text-red-400',
  generate: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  upload: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  submit: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  approve: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  reject: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

// ============ Main AdminPanel ============
export default function AdminPanel() {
  return (
    <div>
      <Tabs defaultValue="departments" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-auto flex-wrap gap-1">
          <TabsTrigger value="departments" className="rounded-lg text-xs data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Building2 className="h-3.5 w-3.5 mr-1" />Departments
          </TabsTrigger>
          <TabsTrigger value="policies" className="rounded-lg text-xs data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <FileText className="h-3.5 w-3.5 mr-1" />Policies
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg text-xs data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <BarChart3 className="h-3.5 w-3.5 mr-1" />Analytics
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-lg text-xs data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <ScrollText className="h-3.5 w-3.5 mr-1" />Audit Logs
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg text-xs data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Settings className="h-3.5 w-3.5 mr-1" />Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments"><DepartmentsTab /></TabsContent>
        <TabsContent value="policies"><PoliciesTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
        <TabsContent value="audit"><AuditLogsTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============ Departments Tab ============
interface DeptWithCounts extends Department {
  _count?: { employees: number; policies: number };
}

function DepartmentsTab() {
  const [departments, setDepartments] = useState<DeptWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<DeptWithCounts | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { name: '', description: '', headName: '' },
  });

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.admin.departments.list();
      const list = res.departments || res.data || res;
      if (Array.isArray(list)) setDepartments(list);
    } catch {
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDepartments(); }, [loadDepartments]);

  function openCreate() {
    setEditing(null);
    reset({ name: '', description: '', headName: '' });
    setShowDialog(true);
  }

  function openEdit(d: DeptWithCounts) {
    setEditing(d);
    reset({ name: d.name, description: d.description || '', headName: d.headName || '' });
    setShowDialog(true);
  }

  async function onSubmit(data: { name: string; description: string; headName: string }) {
    setSubmitting(true);
    try {
      if (editing) {
        await api.admin.departments.update(editing.id, data);
        toast.success('Department updated');
      } else {
        await api.admin.departments.create(data);
        toast.success('Department created');
      }
      setShowDialog(false);
      loadDepartments();
    } catch {
      toast.error('Failed to save department');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.admin.departments.delete(deleteId);
      toast.success('Department deleted');
      setDepartments(prev => prev.filter(d => d.id !== deleteId));
    } catch {
      toast.error('Failed to delete department');
    }
    setDeleteId(null);
  }

  return (
    <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Departments</CardTitle>
          <CardDescription>{departments.length} departments</CardDescription>
        </div>
        <Button onClick={openCreate} size="sm" className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white">
          <Plus className="h-4 w-4 mr-1" />Add
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : departments.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No departments found. Create one to get started.</div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Name</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell">Description</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell">Head</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden sm:table-cell">Employees</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d) => (
                  <TableRow key={d.id} className="border-border/30">
                    <TableCell className="font-medium text-sm">{d.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">{d.description || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{d.headName || '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{d._count?.employees ?? d.employeeCount ?? 0}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={d.isActive ? 'default' : 'secondary'} className={`text-xs ${d.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : ''}`}>
                        {d.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Create'} Department</DialogTitle>
            <DialogDescription>{editing ? 'Update department details' : 'Add a new department to the organization'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...register('name', { required: 'Name is required' })} className="rounded-xl" placeholder="e.g., Engineering" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...register('description')} className="rounded-xl" rows={2} placeholder="Department description..." />
            </div>
            <div className="space-y-2">
              <Label>Department Head</Label>
              <Input {...register('headName')} className="rounded-xl" placeholder="e.g., Jane Smith" />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white">
                {submitting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving...</> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this department? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ============ Policies Tab ============
interface PolicyWithDept extends Policy {
  department?: { id: string; name: string } | null;
}

function PoliciesTab() {
  const [policies, setPolicies] = useState<PolicyWithDept[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewingPolicy, setViewingPolicy] = useState<PolicyWithDept | null>(null);
  const [editing, setEditing] = useState<PolicyWithDept | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [policyCategory, setPolicyCategory] = useState('security');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: { title: '', description: '', content: '', category: 'security', departmentId: '' },
  });

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.admin.policies.list();
      const list = res.policies || res.data || res;
      if (Array.isArray(list)) setPolicies(list);
    } catch {
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const res: any = await api.admin.departments.list();
      const list = res.departments || res.data || res;
      if (Array.isArray(list)) setDepartments(list);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadPolicies(); loadDepartments(); }, [loadPolicies, loadDepartments]);

  function openCreate() {
    setEditing(null);
    reset({ title: '', description: '', content: '', category: 'security', departmentId: '' });
    setPolicyCategory('security');
    setShowDialog(true);
  }

  function openEdit(p: PolicyWithDept) {
    setEditing(p);
    reset({ title: p.title, description: p.description || '', content: p.content, category: p.category, departmentId: p.departmentId || '' });
    setPolicyCategory(p.category);
    setShowDialog(true);
  }

  function openView(p: PolicyWithDept) {
    setViewingPolicy(p);
    setShowViewDialog(true);
  }

  async function onSubmit(data: { title: string; description: string; content: string; category: string; departmentId: string }) {
    setSubmitting(true);
    try {
      const payload = { ...data, departmentId: data.departmentId || undefined };
      if (editing) {
        await api.admin.policies.update(editing.id, payload);
        toast.success('Policy updated');
      } else {
        await api.admin.policies.create(payload);
        toast.success('Policy created');
      }
      setShowDialog(false);
      loadPolicies();
    } catch {
      toast.error('Failed to save policy');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.admin.policies.delete(deleteId);
      toast.success('Policy deleted');
      setPolicies(prev => prev.filter(p => p.id !== deleteId));
    } catch {
      toast.error('Failed to delete policy');
    }
    setDeleteId(null);
  }

  return (
    <>
      <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Policies</CardTitle>
            <CardDescription>{policies.length} policies</CardDescription>
          </div>
          <Button onClick={openCreate} size="sm" className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus className="h-4 w-4 mr-1" />Add
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : policies.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No policies found. Create one to get started.</div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {policies.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl border border-border/30 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{p.title}</h4>
                        <Badge variant="outline" className={`text-xs ${catColors[p.category] || catColors.general}`}>{p.category}</Badge>
                        <Badge variant="secondary" className="text-xs">v{p.version}</Badge>
                      </div>
                      {p.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground">Updated {format(new Date(p.updatedAt), 'MMM d, yyyy')}</span>
                        {p.department && (
                          <Badge variant="outline" className="text-[10px]">{p.department.name}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(p)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Policy Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{viewingPolicy?.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-xs ${viewingPolicy ? catColors[viewingPolicy.category] || catColors.general : ''}`}>
                {viewingPolicy?.category}
              </Badge>
              <span>Version {viewingPolicy?.version}</span>
              {viewingPolicy?.department && <span>· {viewingPolicy.department.name}</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            {viewingPolicy?.description && <p className="text-sm text-muted-foreground mb-3">{viewingPolicy.description}</p>}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/30 text-sm whitespace-pre-wrap leading-relaxed">
              {viewingPolicy?.content || 'No content available.'}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Create'} Policy</DialogTitle>
            <DialogDescription>{editing ? 'Update policy details' : 'Add a new organizational policy'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...register('title', { required: 'Title is required' })} className="rounded-xl" placeholder="Policy title" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={policyCategory} onValueChange={(v) => { setPolicyCategory(v); setValue('category', v); }}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POLICY_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department (optional)</Label>
              <Select value={undefined} onValueChange={(v) => setValue('departmentId', v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select department..." /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input {...register('description')} className="rounded-xl" placeholder="Brief description" />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea {...register('content', { required: 'Content is required' })} className="rounded-xl" rows={6} placeholder="Policy content..." />
              {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white">
                {submitting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving...</> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this policy? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============ Analytics Tab ============
interface AnalyticsData {
  overview: {
    totalEmployees: number;
    onboardingRate: number;
    trainingCompletionRate: number;
    assessmentPassRate: number;
    avgAssessmentScore: number;
    certificateApprovalRate: number;
  };
  employees: {
    byStatus: { status: string; count: number }[];
    byDepartment: { department: string; count: number }[];
    byExperience: { experience: string; count: number }[];
  };
  training: { totalPlans: number; activePlans: number; completedPlans: number };
  assessments: { total: number; totalAttempts: number; passed: number; stats: { id: string; title: string; avgScore: number; totalAttempts: number; passRate: number }[] };
  certificates: { total: number; approved: number; pending: number };
  knowledgeBase: { policies: number; handbooks: number };
}

function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.analytics()
      .then((res: any) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[350px] rounded-2xl" />
          <Skeleton className="h-[350px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="rounded-2xl border-dashed border-2 border-border/50">
        <CardContent className="py-16 text-center">
          <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold mb-1">Analytics Unavailable</h3>
          <p className="text-sm text-muted-foreground">Could not load analytics data.</p>
        </CardContent>
      </Card>
    );
  }

  const kpis = [
    { label: 'Total Employees', value: data.overview.totalEmployees, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Onboarding Rate', value: `${data.overview.onboardingRate}%`, icon: TrendingUp, color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { label: 'Assessment Pass Rate', value: `${data.overview.assessmentPassRate}%`, icon: Target, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'Certificates Issued', value: data.certificates.total, icon: Award, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  const deptChartData = data.employees.byDepartment;
  const statusPieData = data.employees.byStatus.map(s => ({ name: s.status, value: s.count }));
  const expPieData = data.employees.byExperience.map(e => ({ name: e.experience, value: e.count }));
  const assessmentChartData = data.assessments.stats.map(a => ({
    name: a.title.length > 25 ? a.title.slice(0, 25) + '...' : a.title,
    score: a.avgScore,
    passRate: a.passRate,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-xl ${kpi.bg}`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employees by Department Bar */}
        <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Employees by Department</CardTitle>
            <CardDescription>Distribution across departments</CardDescription>
          </CardHeader>
          <CardContent>
            {deptChartData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deptChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="department" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }} />
                  <Bar dataKey="count" name="Employees" radius={[4, 4, 0, 0]}>
                    {deptChartData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Onboarding Status Pie */}
        <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Onboarding Status</CardTitle>
            <CardDescription>Current employee status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {statusPieData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusPieData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Experience Level Pie */}
        <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Experience Level Distribution</CardTitle>
            <CardDescription>Employees by experience level</CardDescription>
          </CardHeader>
          <CardContent>
            {expPieData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={expPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {expPieData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Assessment Scores Bar */}
        <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Assessment Scores</CardTitle>
            <CardDescription>Average scores and pass rates per assessment</CardDescription>
          </CardHeader>
          <CardContent>
            {assessmentChartData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={assessmentChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }} />
                  <Bar dataKey="score" name="Avg Score" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="passRate" name="Pass Rate" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============ Audit Logs Tab ============
interface AuditLogEntry extends AuditLog {
  user?: { id: string; name: string; email: string; role: string } | null;
}

function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [filterResource, setFilterResource] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableResources, setAvailableResources] = useState<string[]>([]);

  const loadLogs = useCallback(async (p: number, action?: string, resource?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p), limit: '20' };
      if (action && action !== 'all') params.action = action;
      if (resource && resource !== 'all') params.resource = resource;

      const res: any = await api.admin.auditLogs(params);
      const logList = res.logs || res.data || res;
      if (Array.isArray(logList)) {
        setLogs(logList);
      }
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
      }
      if (res.summary) {
        setAvailableActions(res.summary.actions?.map((a: { action: string }) => a.action) || []);
        setAvailableResources(res.summary.resources?.map((r: { resource: string }) => r.resource) || []);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs(page, filterAction, filterResource);
  }, [page, filterAction, filterResource, loadLogs]);

  function handleFilterChange(type: 'action' | 'resource', value: string) {
    if (type === 'action') setFilterAction(value);
    else setFilterResource(value);
    setPage(1);
  }

  return (
    <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
      <CardHeader className="flex-row items-center justify-between space-y-0 gap-3 flex-wrap">
        <div>
          <CardTitle className="text-base">Audit Logs</CardTitle>
          <CardDescription>System activity trail</CardDescription>
        </div>
        <div className="flex gap-2">
          <Select value={filterAction} onValueChange={(v) => handleFilterChange('action', v)}>
            <SelectTrigger className="w-[140px] rounded-xl h-9 text-xs">
              <Search className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {availableActions.map((a) => (
                <SelectItem key={a} value={a} className="capitalize">{a.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterResource} onValueChange={(v) => handleFilterChange('resource', v)}>
            <SelectTrigger className="w-[140px] rounded-xl h-9 text-xs">
              <SelectValue placeholder="All Resources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              {availableResources.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No audit logs found.</div>
        ) : (
          <>
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Timestamp</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground">User</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Action</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell">Resource</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground hidden lg:table-cell">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, i) => (
                    <motion.tr
                      key={log.id}
                      as={TableRow}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-border/30"
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{log.user?.name || 'System'}</p>
                          <p className="text-xs text-muted-foreground">{log.user?.email || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs capitalize ${actionColors[log.action] || ''}`}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs">{log.resource}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                        {log.details || '—'}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border/30 mt-4">
                <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Settings Tab ============
interface SettingsEntry {
  key: string;
  value: string;
  type: string;
  description: string;
}

const DEFAULT_SETTINGS: Record<string, { value: string; type: string; description: string; label: string; icon: React.ElementType }> = {
  onboarding_duration_weeks: { value: '4', type: 'number', description: 'Default onboarding duration in weeks', label: 'Onboarding Duration', icon: Calendar },
  assessment_passing_score: { value: '70', type: 'number', description: 'Default passing score for assessments', label: 'Default Passing Score', icon: Target },
  enable_ai_generation: { value: 'true', type: 'boolean', description: 'Enable AI-powered onboarding plan generation', label: 'AI Features Enabled', icon: Cpu },
  auto_approve_certificates: { value: 'false', type: 'boolean', description: 'Automatically approve completed certificates', label: 'Auto-approve Certificates', icon: Award },
  max_upload_size_mb: { value: '50', type: 'number', description: 'Maximum file upload size in megabytes', label: 'Max Upload Size (MB)', icon: HardDrive },
  email_notifications: { value: 'true', type: 'boolean', description: 'Enable email notifications for onboarding events', label: 'Email Notifications', icon: Bell },
  enable_rag_search: { value: 'true', type: 'boolean', description: 'Enable RAG-based handbook search', label: 'RAG Search', icon: Database },
  max_retries: { value: '3', type: 'number', description: 'Maximum quiz retry attempts', label: 'Max Quiz Retries', icon: GraduationCap },
};

function SettingsTab() {
  const [settings, setSettings] = useState<SettingsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.admin.settings.get()
      .then((res: any) => {
        const settingsMap = res.settings || {};
        const entries: SettingsEntry[] = Object.entries(DEFAULT_SETTINGS).map(([key, def]) => ({
          key,
          value: settingsMap[key]?.value ?? def.value,
          type: def.type,
          description: def.description,
        }));
        setSettings(entries);
      })
      .catch(() => {
        const entries: SettingsEntry[] = Object.entries(DEFAULT_SETTINGS).map(([key, def]) => ({
          key,
          value: def.value,
          type: def.type,
          description: def.description,
        }));
        setSettings(entries);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateLocalValue(key: string, value: string) {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  }

  async function handleSave() {
    setSaving(true);
    const updates: Record<string, string> = {};
    settings.forEach(s => { updates[s.key] = s.value; });
    try {
      await api.admin.settings.update(updates);
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">System Settings</CardTitle>
            <CardDescription>Configure platform behavior and preferences</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white">
            {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-1.5" />Save Settings</>}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {settings.map((s) => {
            const def = DEFAULT_SETTINGS[s.key];
            if (!def) return null;
            const Icon = def.icon;

            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 rounded-xl border border-border/30 hover:bg-muted/20 transition-colors gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                    <Icon className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium">{def.label}</h4>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.type === 'boolean' ? (
                    <Switch
                      checked={s.value === 'true'}
                      onCheckedChange={(checked) => updateLocalValue(s.key, String(checked))}
                    />
                  ) : (
                    <Input
                      value={s.value}
                      onChange={(e) => updateLocalValue(s.key, e.target.value)}
                      className="w-28 h-9 text-sm rounded-lg"
                      type={s.type === 'number' ? 'number' : 'text'}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}