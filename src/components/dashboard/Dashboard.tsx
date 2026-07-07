'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  CheckCircle,
  Clock,
  Shield,
  ClipboardCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '@/services/api';
import type { DashboardStats } from '@/types';
import { formatDistanceToNow } from 'date-fns';

/* ──────────── animated counter ──────────── */
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = (value - start) / steps;
    let current = start;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display.toLocaleString()}{suffix}</span>;
}

/* ──────────── Framer Motion variants ──────────── */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

/* ──────────── KPI card definitions ──────────── */
interface KpiDef {
  label: string;
  value: number;
  icon: React.ElementType;
  suffix?: string;
  change: number;
  gradient: string;
  iconBg: string;
  iconColor: string;
}

const CHART_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#ef4444', '#6366f1'];
const PIE_COLORS = ['#10b981', '#f59e0b', '#6b7280'];

/* ──────────── training trend mock data (6 months) ──────────── */
function generateTrainingTrend(completionPercent: number) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    const variance = Math.floor(Math.random() * 16) - 8;
    months.push({
      month: label,
      rate: Math.max(30, Math.min(100, completionPercent - (i * 4) + variance)),
    });
  }
  // Ensure the last month matches the actual stat
  months[months.length - 1].rate = completionPercent;
  return months;
}

/* ──────────── get initials ──────────── */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════ */
export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.dashboard.getStats();
      setStats(data);
    } catch {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  /* ── Build KPI cards from stats ── */
  const kpiCards: KpiDef[] = stats
    ? [
        {
          label: 'Total Employees',
          value: stats.totalEmployees,
          icon: Users,
          change: 12.5,
          gradient: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20',
          iconBg: 'bg-emerald-500/15',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
        },
        {
          label: 'Completed Onboarding',
          value: stats.completedOnboarding,
          icon: CheckCircle,
          change: 8.2,
          gradient: 'from-green-50 to-green-100/50 dark:from-green-950/40 dark:to-green-900/20',
          iconBg: 'bg-green-500/15',
          iconColor: 'text-green-600 dark:text-green-400',
        },
        {
          label: 'Pending Onboarding',
          value: stats.pendingOnboarding,
          icon: Clock,
          change: -3.1,
          gradient: 'from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20',
          iconBg: 'bg-amber-500/15',
          iconColor: 'text-amber-600 dark:text-amber-400',
        },
        {
          label: 'Compliance Score',
          value: stats.complianceScore,
          icon: Shield,
          suffix: '%',
          change: 2.4,
          gradient: 'from-teal-50 to-teal-100/50 dark:from-teal-950/40 dark:to-teal-900/20',
          iconBg: 'bg-teal-500/15',
          iconColor: 'text-teal-600 dark:text-teal-400',
        },
        {
          label: 'Avg Assessment Score',
          value: stats.avgAssessmentScore,
          icon: ClipboardCheck,
          suffix: '%',
          change: 5.7,
          gradient: 'from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20',
          iconBg: 'bg-blue-500/15',
          iconColor: 'text-blue-600 dark:text-blue-400',
        },
        {
          label: 'Training Completion',
          value: stats.trainingCompletion,
          icon: TrendingUp,
          suffix: '%',
          change: 6.3,
          gradient: 'from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/20',
          iconBg: 'bg-purple-500/15',
          iconColor: 'text-purple-600 dark:text-purple-400',
        },
      ]
    : [];

  /* ── Pie chart data for onboarding status ── */
  const pieData = stats
    ? [
        { name: 'Completed', value: stats.completedOnboarding },
        { name: 'Pending', value: stats.pendingOnboarding },
        {
          name: 'Not Started',
          value: Math.max(0, stats.totalEmployees - stats.completedOnboarding - stats.pendingOnboarding),
        },
      ].filter((d) => d.value > 0)
    : [];

  /* ── Training trend (mock) ── */
  const trainingTrend = stats ? generateTrainingTrend(stats.trainingCompletion) : [];

  /* ════════ LOADING STATE ════════ */
  if (loading) {
    return (
      <div className="space-y-6">
        {/* KPI skeleton grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="rounded-xl border-border/50">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-14 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[320px] rounded-xl" />
          <Skeleton className="h-[320px] rounded-xl" />
          <Skeleton className="h-[320px] rounded-xl" />
        </div>
        {/* Activities skeleton */}
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  /* ════════ ERROR STATE ════════ */
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 gap-4"
      >
        <div className="p-4 rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold">Something went wrong</h3>
        <p className="text-sm text-muted-foreground max-w-sm text-center">{error}</p>
        <Button variant="outline" onClick={fetchStats} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </motion.div>
    );
  }

  if (!stats) return null;

  /* ════════ MAIN RENDER ════════ */
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* ────── KPI Cards ────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          const isPositive = kpi.change >= 0;
          return (
            <motion.div key={kpi.label} variants={item}>
              <Card className={`rounded-xl border-border/50 bg-gradient-to-br ${kpi.gradient} hover:shadow-md transition-shadow`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${kpi.iconBg}`}>
                      <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                    </div>
                    <div
                      className={`flex items-center gap-0.5 text-xs font-medium ${
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                      }`}
                    >
                      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(kpi.change)}%
                    </div>
                  </div>
                  <p className="text-2xl font-bold tracking-tight">
                    <AnimatedNumber value={kpi.value} suffix={kpi.suffix} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ────── Charts Row ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart – Employees by Department */}
        <motion.div variants={item}>
          <Card className="rounded-xl border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Employees by Department</CardTitle>
              <CardDescription>Distribution across teams</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.departmentStats.map((d: { name: string; _count?: { employees: number }; count?: number }) => ({ name: d.name, count: (d as Record<string, unknown>)._count ? ((d as Record<string, Record<string, number>>)._count?.employees ?? 0) : (d as Record<string, number>).count ?? 0 }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="name"
                    className="text-xs"
                    tick={{ fill: 'var(--foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'var(--foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,.08)',
                    }}
                    cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart – Onboarding Status Distribution */}
        <motion.div variants={item}>
          <Card className="rounded-xl border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Onboarding Status</CardTitle>
              <CardDescription>Current distribution of onboarding progress</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,.08)',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Line Chart – Training Completion Trend */}
        <motion.div variants={item}>
          <Card className="rounded-xl border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Training Completion Trend</CardTitle>
              <CardDescription>Monthly completion rate (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trainingTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tick={{ fill: 'var(--foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    className="text-xs"
                    tick={{ fill: 'var(--foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,.08)',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Completion']}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2, fill: 'var(--card)' }}
                    name="Completion"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ────── Recent Activities ────── */}
      <motion.div variants={item}>
        <Card className="rounded-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Recent Activities
            </CardTitle>
            <CardDescription>Latest actions across the platform</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[400px]">
              <div className="divide-y">
                {stats.recentActivities.slice(0, 8).map((activity) => {
                  const actionColorMap: Record<string, string> = {
                    completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                    created: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                    generated: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
                    passed: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
                    uploaded: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                    updated: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
                    deleted: 'bg-red-500/10 text-red-600 dark:text-red-400',
                    failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
                  };
                  const avatarColors = [
                    'bg-emerald-500 text-white',
                    'bg-teal-500 text-white',
                    'bg-amber-500 text-white',
                    'bg-purple-500 text-white',
                    'bg-cyan-500 text-white',
                    'bg-rose-500 text-white',
                    'bg-blue-500 text-white',
                    'bg-pink-500 text-white',
                  ];
                  const colorIdx =
                    (typeof activity.user === 'string' ? activity.user : (activity.user?.name || activity.user?.email || 'U'))
                    .split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % avatarColors.length;

                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-muted/40 transition-colors"
                    >
                      {/* Avatar initials */}
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColors[colorIdx]}`}
                      >
                        {getInitials(typeof activity.user === 'string' ? activity.user : (activity.user?.name || activity.user?.email || 'U'))}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">
                          <span className="font-medium">{typeof activity.user === 'string' ? activity.user : (activity.user?.name || activity.user?.email || 'Unknown')}</span>{' '}
                          <span className="text-muted-foreground">{activity.details}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Action badge */}
                      <Badge
                        variant="outline"
                        className={`capitalize text-[11px] shrink-0 ${actionColorMap[activity.action] || 'bg-muted text-muted-foreground'}`}
                      >
                        {activity.action}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}