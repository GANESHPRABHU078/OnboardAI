'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Users,
  Award,
  ClipboardCheck,
  TrendingUp,
  Activity,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  BrainCircuit,
  Trophy,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

/* ── Animated counter ── */
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
      if (current >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(current));
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display.toLocaleString()}{suffix}</span>;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

const COLORS = ['oklch(0.55 0.2 270)', 'oklch(0.65 0.18 160)', 'oklch(0.7 0.15 45)', 'oklch(0.6 0.22 310)', 'oklch(0.65 0.2 200)', 'oklch(0.65 0.18 30)', 'oklch(0.5 0.2 150)', 'oklch(0.55 0.22 20)'];

export default function Analytics() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/analytics', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setData(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[320px] rounded-xl" />)}</div>
      </div>
    );
  }

  if (!data) return null;

  const overview = data.overview as Record<string, number>;

  const kpiCards = [
    { label: 'Total Employees', value: overview.totalEmployees, icon: Users, change: 12.5, color: 'from-[oklch(0.55_0.2_270/0.1)] to-[oklch(0.55_0.2_270/0.03)]', iconColor: 'text-[oklch(0.55_0.2_270)]' },
    { label: 'Active Onboarding', value: overview.onboardingEmployees, icon: Activity, change: 8.2, color: 'from-blue-500/10 to-blue-500/3', iconColor: 'text-blue-500' },
    { label: 'Avg Pass Rate', value: overview.avgPassRate, icon: ClipboardCheck, suffix: '%', change: 5.7, color: 'from-[oklch(0.65_0.18_160/0.1)] to-[oklch(0.65_0.18_160/0.03)]', iconColor: 'text-[oklch(0.65_0.18_160)]' },
    { label: 'Certificate Rate', value: overview.certificateApprovalRate, icon: Award, suffix: '%', change: 3.1, color: 'from-[oklch(0.7_0.15_45/0.1)] to-[oklch(0.7_0.15_45/0.03)]', iconColor: 'text-[oklch(0.7_0.15_45)]' },
    { label: 'Departments', value: overview.totalDepartments, icon: Target, change: 0, color: 'from-[oklch(0.6_0.22_310/0.1)] to-[oklch(0.6_0.22_310/0.03)]', iconColor: 'text-[oklch(0.6_0.22_310)]' },
    { label: 'Assessments', value: overview.totalAssessments, icon: BrainCircuit, change: 15, color: 'from-[oklch(0.65_0.2_200/0.1)] to-[oklch(0.65_0.2_200/0.03)]', iconColor: 'text-[oklch(0.65_0.2_200)]' },
    { label: 'Completed', value: overview.completedEmployees, icon: Trophy, change: 6.3, color: 'from-[oklch(0.65_0.18_30/0.1)] to-[oklch(0.65_0.18_30/0.03)]', iconColor: 'text-[oklch(0.65_0.18_30)]' },
    { label: 'Pending Certs', value: overview.pendingCertificates, icon: TrendingUp, change: -2, color: 'from-amber-500/10 to-amber-500/3', iconColor: 'text-amber-500' },
  ];

  const tooltipStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    fontSize: '12px',
    boxShadow: '0 4px 24px rgba(0,0,0,.1)',
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[oklch(0.55_0.2_270/0.1)]">
            <BarChart3 className="h-5 w-5 text-[oklch(0.55_0.2_270)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Analytics & Reporting</h2>
            <p className="text-sm text-muted-foreground">Comprehensive platform insights</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          const isPositive = (kpi.change || 0) >= 0;
          return (
            <motion.div key={kpi.label} variants={item}>
              <Card className={cn('rounded-xl border-border/30 bg-gradient-to-br', kpi.color, 'hover:shadow-md transition-shadow')}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className={cn('p-2 rounded-lg bg-background/50')}>
                      <Icon className={cn('h-4 w-4', kpi.iconColor)} />
                    </div>
                    {kpi.change !== 0 && (
                      <div className={cn('flex items-center gap-0.5 text-xs font-medium', isPositive ? 'text-[oklch(0.65_0.18_160)]' : 'text-red-500')}>
                        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(kpi.change)}%
                      </div>
                    )}
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

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Employee Growth */}
        <motion.div variants={item}>
          <Card className="rounded-xl border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Employee Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.monthlyEmployees as { month: string; count: number }[]} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'var(--foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="count" stroke={COLORS[0]} fill="url(#colorGrowth)" strokeWidth={2.5} name="New Hires" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quiz Trend */}
        <motion.div variants={item}>
          <Card className="rounded-xl border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Assessment Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.quizTrend as { date: string; avgScore: number; passRate: number }[]} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="avgScore" stroke={COLORS[0]} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} name="Avg Score" />
                  <Line type="monotone" dataKey="passRate" stroke={COLORS[1]} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} name="Pass Rate" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Onboarding Status Pie */}
        <motion.div variants={item}>
          <Card className="rounded-xl border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Onboarding Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.onboardingStatusDist as { name: string; value: number; color: string }[]} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {(data.onboardingStatusDist as { color: string }[]).map((entry, index) => (
                      <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department Distribution */}
        <motion.div variants={item}>
          <Card className="rounded-xl border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Employees by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.departmentDistribution as { name: string; count: number }[]} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--foreground)', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Employees">
                    {(data.departmentDistribution as unknown[]).map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Training Completion by Department */}
        <motion.div variants={item}>
          <Card className="rounded-xl border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Training Completion by Dept</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.trainingByDepartment as { name: string; rate: number }[]} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, 'Completion']} />
                  <Bar dataKey="rate" fill={COLORS[1]} radius={[6, 6, 0, 0]} name="Completion %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 3: Top Performers + Experience Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Performers */}
        <motion.div variants={item}>
          <Card className="rounded-xl border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[oklch(0.7_0.15_45)]" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[300px]">
                <div className="divide-y divide-border/20">
                  {(data.topPerformers as { name: string; position: string; department: string; avgScore: number; quizCount: number }[] || []).map((p, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                        i === 0 ? 'bg-[oklch(0.7_0.15_45/0.15)] text-[oklch(0.7_0.15_45)]' :
                        i === 1 ? 'bg-muted text-muted-foreground' :
                        i === 2 ? 'bg-[oklch(0.6_0.2_30/0.1)] text-[oklch(0.6_0.2_30)]' :
                        'bg-muted/50 text-muted-foreground'
                      )}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.position} · {p.department}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{p.avgScore}%</p>
                        <p className="text-[10px] text-muted-foreground">{p.quizCount} quizzes</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Experience Distribution */}
        <motion.div variants={item}>
          <Card className="rounded-xl border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Experience Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.experienceDistribution as { name: string; value: number }[]}
                    cx="50%" cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    strokeWidth={0}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {(data.experienceDistribution as unknown[]).map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Activity Timeline */}
      <motion.div variants={item}>
        <Card className="rounded-xl border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-[oklch(0.55_0.2_270)]" />
              Recent Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[350px]">
              <div className="px-6 py-3 space-y-0">
                {(data.activityTimeline as { id: string; action: string; resource: string; details?: string; user?: { name: string; role: string } | null; createdAt: string }[] || []).slice(0, 15).map((act, i) => (
                  <div key={act.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary/40 shrink-0 mt-1.5" />
                      {i < 14 && <div className="w-px flex-1 bg-border/40" />}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{act.user?.name || 'System'}</span>
                        <span className="text-muted-foreground"> {act.details || act.action}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                        {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}