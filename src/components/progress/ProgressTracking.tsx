'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Circle,
  Loader2,
  BarChart3,
  Target,
  ChevronDown,
  ChevronUp,
  Trophy,
  Calendar,
  GraduationCap,
  Zap,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
  Cell,
} from 'recharts';
import { api } from '@/services/api';
import type { Employee, ProgressRecord } from '@/types';
import { format } from 'date-fns';

// ============ Types ============
interface ProgressData {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    position: string;
    department: { id: string; name: string } | null;
    status: string;
    joinDate: string;
    onboardingStart?: string;
    onboardingEnd?: string;
  };
  trainingPlan: { id: string; title: string; duration: string; status: string } | null;
  progress: {
    completedModules: number;
    totalModules: number;
    overallProgress: number;
    avgQuizScore: number | null;
    totalAssessments: number;
    passedAssessments: number;
    totalCertificates: number;
    approvedCertificates: number;
  };
  modules: (Record<string, unknown> & {
    index: number;
    title: string;
    description?: string;
    duration?: string;
    type?: string;
    progress: {
      status: string;
      score: number | null;
      completedAt: string | null;
      notes: string | null;
    };
  })[];
  quizResults: {
    id: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    passed: boolean;
    assessment: { id: string; title: string } | null;
    completedAt: string;
  }[];
  certificates: {
    id: string;
    title: string;
    status: string;
    issuedAt: string;
  }[];
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string; ringColor: string }> = {
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-500', label: 'Completed', ringColor: 'ring-emerald-500/30' },
  in_progress: { icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/20', label: 'In Progress', ringColor: 'ring-amber-500/30' },
  pending: { icon: Circle, color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Pending', ringColor: 'ring-muted' },
};

// ============ Circular Progress Component ============
function CircularProgress({ value, size = 160, strokeWidth = 12 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const isComplete = value === 100;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-emerald-100 dark:text-emerald-950/50"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
          {value}%
        </span>
        <span className="text-xs text-muted-foreground font-medium">Complete</span>
      </div>
    </div>
  );
}

// ============ Main Component ============
export default function ProgressTracking() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      const res: any = await api.employees.list({ page: '1', limit: '50' });
      const list = res.employees || res.data || res;
      if (Array.isArray(list)) setEmployees(list);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (!selectedEmployee) {
      setProgressData(null);
      return;
    }
    setProgressLoading(true);
    setExpandedModule(null);
    api.progress.get(selectedEmployee)
      .then((data: any) => {
        setProgressData(data);
      })
      .catch(() => {
        setProgressData(null);
      })
      .finally(() => setProgressLoading(false));
  }, [selectedEmployee]);

  const selectedEmp = employees.find((e) => e.id === selectedEmployee);

  // Computed values from API data
  const overallProgress = progressData?.progress.overallProgress ?? 0;
  const completedModules = progressData?.progress.completedModules ?? 0;
  const totalModules = progressData?.progress.totalModules ?? 0;
  const inProgressModules = progressData?.modules.filter(m => m.progress?.status === 'in_progress').length ?? 0;
  const avgQuizScore = progressData?.progress.avgQuizScore ?? null;
  const passedAssessments = progressData?.progress.passedAssessments ?? 0;
  const totalAssessments = progressData?.progress.totalAssessments ?? 0;

  // Quiz scores for chart
  const quizChartData = (progressData?.quizResults || []).map(r => ({
    name: r.assessment?.title?.length > 20 ? r.assessment.title.slice(0, 20) + '...' : (r.assessment?.title || 'Quiz'),
    score: r.score,
    passed: r.passed,
  }));

  const quizAvg = quizChartData.length > 0
    ? Math.round(quizChartData.reduce((s, d) => s + d.score, 0) / quizChartData.length)
    : 0;
  const quizHighest = quizChartData.length > 0 ? Math.max(...quizChartData.map(d => d.score)) : 0;
  const quizLowest = quizChartData.length > 0 ? Math.min(...quizChartData.map(d => d.score)) : 0;

  // Estimated time remaining (simple calc based on remaining modules)
  const remainingModules = totalModules - completedModules - inProgressModules;
  const estDaysRemaining = remainingModules > 0 ? remainingModules * 2 : 0;

  // Skills extracted from employee data or modules
  const skillsAcquired = progressData?.modules
    .filter(m => m.progress?.status === 'completed')
    .map(m => m.title)
    .slice(0, 5) || [];

  // Timeline items
  const timelineItems: { label: string; date?: string; status: string }[] = [];
  if (progressData) {
    const emp = progressData.employee;
    timelineItems.push({
      label: 'Onboarding Started',
      date: emp.onboardingStart || emp.joinDate,
      status: 'completed',
    });
    progressData.modules.forEach((m) => {
      timelineItems.push({
        label: m.title,
        date: m.progress?.completedAt || undefined,
        status: m.progress?.status || 'pending',
      });
    });
    if (overallProgress === 100) {
      timelineItems.push({
        label: 'Onboarding Complete',
        date: emp.onboardingEnd || undefined,
        status: 'completed',
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Employee Selector */}
      <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="text-sm font-medium mb-1.5 block">Select Employee</label>
              {loading && !selectedEmployee ? (
                <Skeleton className="h-10 w-full rounded-xl" />
              ) : (
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="rounded-xl h-10 w-full">
                    <SelectValue placeholder="Choose an employee to track progress..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} — {e.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {selectedEmp && (
              <Badge variant="outline" className="capitalize rounded-lg">
                {selectedEmp.status}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedEmployee ? (
        <Card className="rounded-2xl border-dashed border-2 border-border/50">
          <CardContent className="py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-emerald-500/50" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select an Employee</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">Choose an employee above to view their onboarding progress, quiz scores, and completion timeline.</p>
          </CardContent>
        </Card>
      ) : progressLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 rounded-2xl"><CardContent className="p-6 flex items-center justify-center"><Skeleton className="h-40 w-40 rounded-full" /></CardContent></Card>
            <Card className="lg:col-span-2 rounded-2xl"><CardContent className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</CardContent></Card>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        </div>
      ) : progressData ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Overall Progress + Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Circular Progress */}
            <Card className="lg:col-span-1 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20">
              <CardContent className="p-6 flex flex-col items-center justify-center">
                <CircularProgress value={overallProgress} />
                <p className="text-sm font-semibold mt-4 text-emerald-700 dark:text-emerald-300">
                  {overallProgress === 100 ? 'Completed' : 'In Progress'}
                </p>
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  {completedModules} of {totalModules} modules done
                </p>
                {estDaysRemaining > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>~{estDaysRemaining} days remaining</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                      <BarChart3 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">Completion</span>
                  </div>
                  <p className="text-2xl font-bold">{overallProgress}%</p>
                  <Progress value={overallProgress} className="h-1.5 mt-2" />
                </CardContent>
              </Card>
              <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">Completed</span>
                  </div>
                  <p className="text-2xl font-bold">{completedModules}<span className="text-sm text-muted-foreground font-normal">/{totalModules}</span></p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10">
                      <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">In Progress</span>
                  </div>
                  <p className="text-2xl font-bold">{inProgressModules}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10">
                      <Target className="h-4 w-4 text-cyan-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">Quiz Avg</span>
                  </div>
                  <p className="text-2xl font-bold">{avgQuizScore !== null ? avgQuizScore : '—'}<span className="text-sm text-muted-foreground font-normal">%</span></p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Module Progress List */}
          <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Module Progress</CardTitle>
              <CardDescription>{completedModules} completed, {inProgressModules} in progress, {totalModules - completedModules - inProgressModules} pending</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {progressData.modules.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No modules found for this employee.</div>
              ) : (
                progressData.modules.map((mod, i) => {
                  const config = statusConfig[mod.progress?.status || 'pending'];
                  const Icon = config.icon;
                  const isExpanded = expandedModule === i;
                  const modulePercent = mod.progress?.status === 'completed' ? 100 : mod.progress?.status === 'in_progress' ? 50 : 0;

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <button
                        onClick={() => setExpandedModule(isExpanded ? null : i)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-muted/30 text-left ${mod.progress?.status === 'in_progress' ? 'bg-amber-500/5' : ''}`}
                      >
                        <div className="relative shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bgColor} ring-2 ${config.ringColor}`}>
                            <Icon className={`h-4 w-4 ${config.color} ${mod.progress?.status === 'in_progress' ? 'animate-pulse' : ''}`} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground shrink-0">M{mod.index + 1}</span>
                            <p className={`text-sm font-medium truncate ${mod.progress?.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                              {mod.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <Progress value={modulePercent} className="h-1 flex-1 max-w-[120px]" />
                            {mod.progress?.score !== null && mod.progress?.score !== undefined && (
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                Score: {mod.progress.score}%
                              </span>
                            )}
                            {mod.progress?.completedAt && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(mod.progress.completedAt), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize shrink-0 ${config.color}`}
                        >
                          {config.label}
                        </Badge>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-11 mr-3 mb-2 p-3 rounded-lg bg-muted/20 border border-border/30">
                              {mod.description && (
                                <p className="text-sm text-muted-foreground mb-2">{mod.description}</p>
                              )}
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                {mod.type && (
                                  <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{mod.type}</span>
                                )}
                                {mod.duration && (
                                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{mod.duration}</span>
                                )}
                                {mod.progress?.notes && (
                                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{mod.progress.notes}</span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Quiz Scores + Timeline Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quiz Scores Bar Chart */}
            <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Quiz Scores</CardTitle>
                <CardDescription>Assessment results per module</CardDescription>
              </CardHeader>
              <CardContent>
                {quizChartData.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                    No quiz results yet
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-2 rounded-lg bg-emerald-500/5">
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{quizAvg}%</p>
                        <p className="text-xs text-muted-foreground">Average</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-cyan-500/5">
                        <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{quizHighest}%</p>
                        <p className="text-xs text-muted-foreground">Highest</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-amber-500/5">
                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{quizLowest}%</p>
                        <p className="text-xs text-muted-foreground">Lowest</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={quizChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }} />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]} name="Score">
                          {quizChartData.map((entry, index) => (
                            <Cell key={index} fill={entry.passed ? '#10b981' : '#f59e0b'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Timeline Visualization */}
            <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Timeline</CardTitle>
                <CardDescription>Onboarding journey progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative max-h-[320px] overflow-y-auto pr-2">
                  <div className="space-y-0">
                    {timelineItems.map((item, i) => {
                      const config = statusConfig[item.status] || statusConfig.pending;
                      const Icon = config.icon;
                      const isLast = i === timelineItems.length - 1;

                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex gap-3"
                        >
                          {/* Timeline line + dot */}
                          <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ring-2 ${config.ringColor} ${config.bgColor}`}>
                              <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                            </div>
                            {!isLast && (
                              <div className={`w-0.5 flex-1 min-h-[24px] ${item.status === 'completed' ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-border'}`} />
                            )}
                          </div>
                          {/* Content */}
                          <div className={`pb-4 ${isLast ? '' : ''}`}>
                            <p className={`text-sm font-medium ${item.status === 'completed' ? '' : 'text-muted-foreground'}`}>
                              {item.label}
                            </p>
                            {item.date && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(new Date(item.date), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Training Completion Card */}
          <Card className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-emerald-500/20">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Trophy className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Training Completion</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {progressData.employee.firstName} {progressData.employee.lastName} — {progressData.employee.position}
                    </p>
                    {progressData.employee.department && (
                      <p className="text-xs text-muted-foreground">{progressData.employee.department.name}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{overallProgress}%</p>
                  <p className="text-xs text-muted-foreground">{completedModules} / {totalModules} modules</p>
                </div>
              </div>

              {skillsAcquired.length > 0 && (
                <>
                  <Separator className="my-4 bg-emerald-500/20" />
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap className="h-3.5 w-3.5 text-emerald-500" />
                      <p className="text-xs font-medium text-muted-foreground">Skills Acquired</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {skillsAcquired.map((skill, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg">
                          {skill.length > 30 ? skill.slice(0, 30) + '...' : skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center p-2 rounded-lg bg-white/50 dark:bg-black/20">
                  <p className="text-lg font-bold">{totalAssessments}</p>
                  <p className="text-xs text-muted-foreground">Assessments</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/50 dark:bg-black/20">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{passedAssessments}</p>
                  <p className="text-xs text-muted-foreground">Passed</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/50 dark:bg-black/20">
                  <p className="text-lg font-bold">{progressData.progress.totalCertificates}</p>
                  <p className="text-xs text-muted-foreground">Certificates</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/50 dark:bg-black/20">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{progressData.progress.approvedCertificates}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <Card className="rounded-2xl border-dashed border-2 border-border/50">
          <CardContent className="py-16 text-center">
            <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="text-lg font-semibold mb-1">No Progress Data</h3>
            <p className="text-sm text-muted-foreground">No onboarding progress found for this employee yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}