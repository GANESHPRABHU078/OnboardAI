'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Shield,
  GraduationCap,
  Award,
  FileCheck,
  Clock,
  UserX,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { api } from '@/services/api';
import type { Employee, Department } from '@/types';
import { toast } from 'sonner';

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  onboarding: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  inactive: 'bg-gray-400/15 text-gray-500 dark:text-gray-400 border-gray-400/20',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  onboarding: 'secondary',
  completed: 'default',
  inactive: 'outline',
};

const experienceOptions = ['junior', 'mid', 'senior', 'lead'] as const;
const roleOptions = ['admin', 'hr', 'employee'] as const;
const securityOptions = ['standard', 'elevated', 'restricted', 'top-secret'] as const;

/* ═══════════════════════════════════════════
   FORM SCHEMA
   ═══════════════════════════════════════════ */

const employeeFormSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional().or(z.literal('')),
  departmentId: z.string().optional().or(z.literal('')),
  position: z.string().min(2, 'Position is required'),
  role: z.enum(roleOptions).default('employee'),
  experience: z.enum(experienceOptions).default('junior'),
  securityLevel: z.enum(securityOptions).default('standard'),
  skills: z.string().optional().or(z.literal('')),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

/* ═══════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════ */

const rowVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

/* ═══════════════════════════════════════════
   HELPER – get initials
   ═══════════════════════════════════════════ */

function getInitials(first: string, last: string) {
  return `${(first?.[0] || '').toUpperCase()}${(last?.[0] || '').toUpperCase()}`;
}

const avatarPalette = [
  'bg-emerald-500 text-white',
  'bg-teal-500 text-white',
  'bg-amber-500 text-white',
  'bg-purple-500 text-white',
  'bg-cyan-500 text-white',
  'bg-rose-500 text-white',
  'bg-pink-500 text-white',
  'bg-orange-500 text-white',
];

function avatarColor(name: string) {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % avatarPalette.length;
  return avatarPalette[idx];
}

/* ═══════════════════════════════════════════
   SORT TYPE
   ═══════════════════════════════════════════ */

type SortField = 'firstName' | 'employeeId' | 'email' | 'department' | 'position' | 'status' | 'experience' | 'joinDate';
type SortDir = 'asc' | 'desc';

/* ═══════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════ */

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════ */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      {...fadeIn}
      className="flex flex-col items-center justify-center py-16 gap-4"
    >
      <div className="p-4 rounded-full bg-muted">
        <Users className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">No employees found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {`There are no employees matching your current filters. Try adjusting your search or add a new employee.`}
        </p>
      </div>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" />
        Add Employee
      </Button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   EMPLOYEE DETAIL VIEW (inside Sheet)
   ═══════════════════════════════════════════ */

function EmployeeDetail({
  employee,
  onEdit,
}: {
  employee: Employee;
  onEdit: () => void;
}) {
  const infoItems = [
    { icon: Mail, label: 'Email', value: employee.email },
    { icon: Phone, label: 'Phone', value: employee.phone || '—' },
    { icon: Building2, label: 'Department', value: employee.department?.name || '—' },
    { icon: Briefcase, label: 'Position', value: employee.position },
    { icon: Shield, label: 'Security Level', value: employee.securityLevel || '—' },
    { icon: Calendar, label: 'Join Date', value: employee.joinDate ? format(new Date(employee.joinDate), 'MMM d, yyyy') : '—' },
  ];

  const statusSteps = [
    { label: 'Joined', date: employee.joinDate, done: true },
    { label: 'Onboarding Started', date: employee.onboardingStart, done: !!employee.onboardingStart },
    { label: 'Onboarding Completed', date: employee.onboardingEnd, done: employee.status === 'completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className={`h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold ${avatarColor(employee.firstName + employee.lastName)}`}>
          {getInitials(employee.firstName, employee.lastName)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="text-sm text-muted-foreground">{employee.position}</p>
        </div>
        <Badge variant="outline" className={STATUS_STYLES[employee.status] || ''}>
          {employee.status}
        </Badge>
      </div>

      <Separator />

      <Tabs defaultValue="overview">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="training" className="flex-1">Training</TabsTrigger>
          <TabsTrigger value="assessments" className="flex-1">Assessments</TabsTrigger>
          <TabsTrigger value="certificates" className="flex-1">Certificates</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {infoItems.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2 p-3 rounded-lg bg-muted/40">
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Skills */}
          {employee.skills && (
            <div>
              <h4 className="text-sm font-medium mb-2">Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {(() => {
                  try {
                    const parsed = typeof employee.skills === 'string' ? JSON.parse(employee.skills) : employee.skills;
                    if (Array.isArray(parsed)) {
                      return parsed.map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ));
                    }
                  } catch {
                    // not json, treat as comma-separated
                  }
                  return employee.skills.split(',').filter(Boolean).map((s: string) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s.trim()}</Badge>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Status Timeline */}
          <div>
            <h4 className="text-sm font-medium mb-3">Status Timeline</h4>
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
              {statusSteps.map((step, i) => (
                <div key={i} className="relative flex items-start gap-3">
                  <div
                    className={`absolute -left-6 top-1 h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center z-10 ${
                      step.done
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-background border-muted-foreground/30'
                    }`}
                  >
                    {step.done && (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${!step.done ? 'text-muted-foreground' : ''}`}>{step.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.done && step.date ? format(new Date(step.date), 'MMM d, yyyy') : 'Pending'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={onEdit} variant="outline" className="w-full gap-2">
            <Pencil className="h-4 w-4" />
            Edit Employee
          </Button>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="mt-4">
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium">Training Plans</p>
              <p className="text-xs text-muted-foreground mt-1">
                Training plans will appear here once generated for this employee.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="mt-4">
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <FileCheck className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium">Assessment Results</p>
              <p className="text-xs text-muted-foreground mt-1">
                Assessment results will appear here after the employee completes assessments.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="mt-4">
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <Award className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium">Certificates</p>
              <p className="text-xs text-muted-foreground mt-1">
                Certificates will appear here once issued to this employee.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export default function EmployeeManagement() {
  /* ── state ── */
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('firstName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ── form ── */
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      departmentId: '',
      position: '',
      role: 'employee',
      experience: 'junior',
      securityLevel: 'standard',
      skills: '',
    },
  });

  /* ── fetch employees ── */
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      };
      if (search) params.search = search;
      if (filterDepartment) params.departmentId = filterDepartment;
      if (filterStatus) params.status = filterStatus;
      if (filterRole) params.role = filterRole;

      const data = await api.employees.list(params);
      setEmployees(data.employees || []);
      if (data.pagination) {
        setPagination((prev) => ({ ...prev, ...data.pagination }));
      }
    } catch {
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, filterDepartment, filterStatus, filterRole]);

  /* ── fetch departments for filter dropdown ── */
  const fetchDepartments = useCallback(async () => {
    try {
      const data = await api.admin.departments.list();
      setDepartments(Array.isArray(data) ? data : data.departments || []);
    } catch {
      // silently fail – departments filter just won't populate
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  /* ── reset to page 1 when filters change ── */
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [search, filterDepartment, filterStatus, filterRole]);

  /* ── sorting ── */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedEmployees = useMemo(() => {
    const arr = [...employees];
    arr.sort((a, b) => {
      let aVal: string = '';
      let bVal: string = '';
      switch (sortField) {
        case 'firstName':
          aVal = a.firstName.toLowerCase();
          bVal = b.firstName.toLowerCase();
          break;
        case 'employeeId':
          aVal = a.employeeId.toLowerCase();
          bVal = b.employeeId.toLowerCase();
          break;
        case 'email':
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case 'department':
          aVal = (a.department?.name || '').toLowerCase();
          bVal = (b.department?.name || '').toLowerCase();
          break;
        case 'position':
          aVal = a.position.toLowerCase();
          bVal = b.position.toLowerCase();
          break;
        case 'status':
          aVal = a.status.toLowerCase();
          bVal = b.status.toLowerCase();
          break;
        case 'experience':
          aVal = a.experience.toLowerCase();
          bVal = b.experience.toLowerCase();
          break;
        case 'joinDate':
          aVal = a.joinDate || '';
          bVal = b.joinDate || '';
          break;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [employees, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-30" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3 w-3 text-emerald-500" />
    ) : (
      <ChevronDown className="h-3 w-3 text-emerald-500" />
    );
  };

  /* ── clear all filters ── */
  const clearFilters = () => {
    setSearch('');
    setFilterDepartment('');
    setFilterStatus('');
    setFilterRole('');
  };

  const hasFilters = search || filterDepartment || filterStatus || filterRole;

  /* ── handlers ── */
  const openCreateForm = () => {
    setSelectedEmployee(null);
    form.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      departmentId: '',
      position: '',
      role: 'employee',
      experience: 'junior',
      securityLevel: 'standard',
      skills: '',
    });
    setFormOpen(true);
  };

  const openEditForm = (emp: Employee) => {
    setSelectedEmployee(emp);
    form.reset({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone || '',
      departmentId: emp.departmentId || '',
      position: emp.position,
      role: emp.role as 'admin' | 'hr' | 'employee',
      experience: emp.experience as 'junior' | 'mid' | 'senior' | 'lead',
      securityLevel: (emp.securityLevel || 'standard') as 'standard' | 'elevated' | 'restricted' | 'top-secret',
      skills: (() => {
        try {
          const parsed = typeof emp.skills === 'string' ? JSON.parse(emp.skills) : emp.skills;
          if (Array.isArray(parsed)) return parsed.join(', ');
        } catch { /* not json */ }
        return emp.skills || '';
      })(),
    });
    setFormOpen(true);
  };

  const openDetail = async (emp: Employee) => {
    setSelectedEmployee(emp);
    setDetailOpen(true);
    // Fetch full employee details
    try {
      const data = await api.employees.get(emp.id);
      // The API wraps in { employee: ... }
      const fullEmp = (data as Record<string, unknown>).employee
        ? ((data as Record<string, unknown>).employee as Employee)
        : (data as Employee);
      setSelectedEmployee({ ...emp, ...fullEmp });
    } catch {
      // Use the list data as fallback
    }
  };

  const openDelete = (emp: Employee) => {
    setSelectedEmployee(emp);
    setDeleteOpen(true);
  };

  const onSubmit = async (values: EmployeeFormValues) => {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone || undefined,
        departmentId: values.departmentId || undefined,
        position: values.position,
        role: values.role,
        experience: values.experience,
        securityLevel: values.securityLevel,
        skills: values.skills
          ? values.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      };

      if (selectedEmployee) {
        await api.employees.update(selectedEmployee.id, payload);
        toast.success(`${values.firstName} ${values.lastName} has been updated`);
      } else {
        await api.employees.create(payload);
        toast.success(`${values.firstName} ${values.lastName} has been added`);
      }
      setFormOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!selectedEmployee) return;
    setSubmitting(true);
    try {
      await api.employees.delete(selectedEmployee.id);
      toast.success(`${selectedEmployee.firstName} ${selectedEmployee.lastName} has been deleted`);
      setDeleteOpen(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete employee');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── pagination helpers ── */
  const goToPage = (p: number) => {
    if (p < 1 || p > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page: p }));
  };

  const pageNumbers = useMemo(() => {
    const total = pagination.totalPages;
    const current = pagination.page;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    if (total > 1) pages.push(total);
    return pages;
  }, [pagination.totalPages, pagination.page]);

  const startIdx = (pagination.page - 1) * pagination.limit + 1;
  const endIdx = Math.min(pagination.page * pagination.limit, pagination.total);

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */

  return (
    <div className="space-y-4">
      {/* ────── Header ────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage your team members and their onboarding progress
          </p>
        </div>
        <Button onClick={openCreateForm} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* ────── Search & Filters ────── */}
      <motion.div
        {...fadeIn}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or ID..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-full sm:w-[130px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="hr">HR</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 shrink-0">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </motion.div>

      {/* ────── Data Table Card ────── */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('firstName')}>
                    <div className="flex items-center gap-1">
                      Name <SortIcon field="firstName" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('employeeId')}>
                    <div className="flex items-center gap-1">
                      ID <SortIcon field="employeeId" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort('email')}>
                    <div className="flex items-center gap-1">
                      Email <SortIcon field="email" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hidden lg:table-cell" onClick={() => handleSort('department')}>
                    <div className="flex items-center gap-1">
                      Department <SortIcon field="department" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hidden sm:table-cell" onClick={() => handleSort('position')}>
                    <div className="flex items-center gap-1">
                      Position <SortIcon field="position" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1">
                      Status <SortIcon field="status" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hidden xl:table-cell" onClick={() => handleSort('experience')}>
                    <div className="flex items-center gap-1">
                      Exp <SortIcon field="experience" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hidden lg:table-cell" onClick={() => handleSort('joinDate')}>
                    <div className="flex items-center gap-1">
                      Join Date <SortIcon field="joinDate" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <TableSkeleton />
                    </TableCell>
                  </TableRow>
                ) : sortedEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <EmptyState onAdd={openCreateForm} />
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence>
                    {sortedEmployees.map((emp) => (
                      <motion.tr
                        key={emp.id}
                        variants={rowVariants}
                        initial="hidden"
                        animate="show"
                        exit="hidden"
                        className="hover:bg-muted/50 border-b transition-colors"
                      >
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(emp.firstName + emp.lastName)}`}
                            >
                              {getInitials(emp.firstName, emp.lastName)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {emp.firstName} {emp.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground md:hidden truncate">
                                {emp.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-muted-foreground font-mono">
                          {emp.employeeId}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell truncate max-w-[200px]">
                          {emp.email}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-muted-foreground hidden lg:table-cell">
                          {emp.department?.name || '—'}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-muted-foreground hidden sm:table-cell">
                          {emp.position}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge
                            variant={STATUS_VARIANT[emp.status] || 'outline'}
                            className={`text-xs capitalize ${STATUS_STYLES[emp.status] || ''}`}
                          >
                            {emp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-muted-foreground hidden xl:table-cell capitalize">
                          {emp.experience}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-muted-foreground hidden lg:table-cell">
                          {emp.joinDate ? format(new Date(emp.joinDate), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetail(emp)} className="gap-2">
                                <Eye className="h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditForm(emp)} className="gap-2">
                                <Pencil className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDelete(emp)}
                                variant="destructive"
                                className="gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* ────── Pagination ────── */}
        {!loading && employees.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{startIdx}</span> to{' '}
              <span className="font-medium text-foreground">{endIdx}</span> of{' '}
              <span className="font-medium text-foreground">{pagination.total}</span> employees
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={pagination.page <= 1}
                onClick={() => goToPage(pagination.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {pageNumbers.map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-2 text-muted-foreground text-sm">
                    ...
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={pagination.page === p ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => goToPage(p)}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => goToPage(pagination.page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ═══════════════════════════════════════
         ADD / EDIT DIALOG
         ═══════════════════════════════════════ */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {selectedEmployee
                ? `Update ${selectedEmployee.firstName} ${selectedEmployee.lastName}'s information`
                : 'Fill in the details to create a new employee record'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Last Name */}
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1 (555) 000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Department */}
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Position */}
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input placeholder="Software Engineer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Role */}
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Experience */}
                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {experienceOptions.map((opt) => (
                            <SelectItem key={opt} value={opt} className="capitalize">
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Security Level */}
                <FormField
                  control={form.control}
                  name="securityLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Level</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {securityOptions.map((opt) => (
                            <SelectItem key={opt} value={opt} className="capitalize">
                              {opt.replace('-', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Skills */}
              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skills</FormLabel>
                    <FormControl>
                      <Input placeholder="React, TypeScript, Node.js (comma-separated)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : selectedEmployee ? 'Update Employee' : 'Create Employee'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════
         DELETE CONFIRMATION
         ═══════════════════════════════════════ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{' '}
              <span className="font-semibold text-foreground">
                {selectedEmployee?.firstName} {selectedEmployee?.lastName}
              </span>{' '}
              and all associated data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              disabled={submitting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {submitting ? 'Deleting...' : 'Delete Employee'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════════════════════════
         EMPLOYEE DETAIL SHEET
         ═══════════════════════════════════════ */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="sm:max-w-md w-full p-0 overflow-y-auto">
          {selectedEmployee && (
            <>
              <SheetHeader className="p-6 pb-0">
                <SheetTitle>Employee Details</SheetTitle>
                <SheetDescription>
                  Viewing profile of {selectedEmployee.firstName} {selectedEmployee.lastName}
                </SheetDescription>
              </SheetHeader>
              <div className="px-6 pb-6 pt-4">
                <EmployeeDetail
                  employee={selectedEmployee}
                  onEdit={() => {
                    setDetailOpen(false);
                    openEditForm(selectedEmployee);
                  }}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}