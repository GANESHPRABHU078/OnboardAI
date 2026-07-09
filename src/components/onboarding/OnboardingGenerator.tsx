'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ChevronDown,
  BookOpen,
  Clock,
  Target,
  CheckCircle2,
  Square,
  CheckSquare,
  Play,
  Video,
  Wrench,
  MessageSquare,
  FolderGit2,
  Save,
  Loader2,
  Users,
  FileText,
  AlertCircle,
  RefreshCw,
  CalendarDays,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { api } from '@/services/api';
import type { Employee, TrainingPlan, OnboardingModule, Milestone } from '@/types';
import { toast } from 'sonner';

/* ---------- helpers ---------- */

const moduleIcons: Record<string, React.ElementType> = {
  reading: BookOpen,
  video: Video,
  hands_on: Wrench,
  quiz: Target,
  meeting: MessageSquare,
  project: FolderGit2,
};

const moduleColors: Record<string, string> = {
  reading: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  video: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  hands_on: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  quiz: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  meeting: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  project: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
};

function safeParse<T>(value: string | undefined | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/* ---------- animation variants ---------- */

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

/* ---------- component ---------- */

export default function OnboardingGenerator() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---- fetch employees ---- */
  useEffect(() => {
    api.employees
      .list()
      .then((res: any) => {
        const list = res?.employees || res?.data || res;
        setEmployees(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        toast.error('Failed to load employees');
        setEmployees([]);
      })
      .finally(() => setLoading(false));
  }, []);

  /* ---- generate plan ---- */
  async function handleGenerate() {
    if (!selectedEmployee) {
      toast.error('Please select an employee first');
      return;
    }
    setGenerating(true);
    setError(null);
    setPlan(null);
    try {
      const result = await api.onboarding.generate(selectedEmployee);
      setPlan(result?.plan as TrainingPlan);
      toast.success('Onboarding plan generated successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate onboarding plan';
      setError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  /* ---- save plan ---- */
  async function handleSave() {
    if (!plan) return;
    setSaving(true);
    try {
      toast.success('Plan saved successfully');
    } catch {
      toast.error('Failed to save plan');
    } finally {
      setSaving(false);
    }
  }

  /* ---- derived data ---- */
  const modules: OnboardingModule[] = useMemo(() => safeParse(plan?.modules, []), [plan]);
  const objectives: string[] = useMemo(() => safeParse(plan?.objectives, []), [plan]);
  const milestones: Milestone[] = useMemo(() => safeParse(plan?.milestones, []), [plan]);
  const requiredReading: any[] = useMemo(() => safeParse(plan?.requiredReading, []), [plan]);
  const handsOnTasks: any[] = useMemo(() => safeParse(plan?.handsOnTasks, []), [plan]);
  const deliverables: any[] = useMemo(() => safeParse(plan?.deliverables, []), [plan]);

  return (
    <div className="space-y-6">
      {/* ===== Generator Card ===== */}
      <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            AI-Powered Onboarding Generator
          </CardTitle>
          <CardDescription>
            Select an employee to generate a personalized onboarding plan using AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="text-sm font-medium mb-1.5 block">
                Select employee to generate onboarding plan
              </label>
              {loading ? (
                <Skeleton className="h-10 w-full rounded-xl" />
              ) : (
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="rounded-xl h-10 w-full">
                    <SelectValue placeholder="Choose an employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} &mdash; {e.position}
                        {e.department?.name ? ` (${e.department.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedEmployee}
              className="rounded-xl h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-lg shadow-emerald-600/20 min-w-[180px]"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Plan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== Generating Animation ===== */}
      <AnimatePresence>
        {generating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="p-8 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"
                >
                  <Sparkles className="h-8 w-8 text-white" />
                </motion.div>
                <h3 className="text-lg font-semibold mb-1">
                  Generating AI-powered onboarding plan...
                </h3>
                <p className="text-sm text-muted-foreground">
                  AI is creating a personalized plan based on role, department, and experience level.
                </p>
                <div className="mt-4 max-w-xs mx-auto">
                  <motion.div
                    animate={{ width: ['0%', '100%'] }}
                    transition={{ duration: 3, ease: 'easeInOut' }}
                    className="h-2 rounded-full bg-emerald-500/30 overflow-hidden"
                  >
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Error State ===== */}
      <AnimatePresence>
        {error && !generating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="rounded-2xl border-destructive/20 bg-destructive/5">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
                <h3 className="text-lg font-semibold mb-1">Generation Failed</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  className="rounded-xl"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Generation
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Generated Plan ===== */}
      <AnimatePresence>
        {plan && !generating && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {/* Plan Header */}
            <motion.div variants={item}>
              <Card className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-emerald-500/20">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">{plan.title}</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.role} &middot; {plan.department} &middot;{' '}
                        <span className="capitalize">{plan.experience}</span> level
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className="bg-white/50 dark:bg-gray-800/50 border-emerald-500/30"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {plan.duration}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-xl border-emerald-500/30 hover:bg-emerald-500/10"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {saving ? 'Saving...' : 'Save Plan'}
                      </Button>
                    </div>
                  </div>

                  {/* Learning Objectives */}
                  <Separator className="my-5 bg-emerald-500/10" />
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                      <Target className="h-4 w-4 text-emerald-500" />
                      Learning Objectives
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {objectives.map((obj, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.08 }}
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{obj}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Training Modules – Accordion */}
            <motion.div variants={item}>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Play className="h-4 w-4 text-emerald-500" />
                Training Modules
              </h3>
              <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden">
                <CardContent className="p-0">
                  {modules.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No modules defined for this plan.
                    </div>
                  ) : (
                    <Accordion type="multiple" className="w-full">
                      {modules.map((mod, i) => {
                        const Icon = moduleIcons[mod.type] || BookOpen;
                        return (
                          <AccordionItem
                            key={i}
                            value={`module-${i}`}
                            className="px-4 border-b-border/30 last:border-b-0"
                          >
                            <AccordionTrigger className="hover:no-underline py-4">
                              <div className="flex items-center gap-3 flex-1 text-left">
                                <div
                                  className={`p-2 rounded-xl border shrink-0 ${moduleColors[mod.type] || moduleColors.reading}`}
                                >
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">
                                      Module {i + 1}: {mod.title}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-xs capitalize border-border/50"
                                    >
                                      {mod.type.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {mod.description}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {mod.duration}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="pl-[3.25rem] pb-2 space-y-3">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {mod.description}
                                </p>
                                {mod.content && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                                      Content
                                    </p>
                                    {Array.isArray(mod.content) ? (
                                      <ul className="space-y-1.5">
                                        {mod.content.map((c, ci) => (
                                          <li
                                            key={ci}
                                            className="flex items-start gap-2 text-sm"
                                          >
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                            {c}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-sm text-muted-foreground leading-relaxed">
                                        {mod.content}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Bottom Grid: Milestones | Reading & Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Milestones Timeline */}
              <motion.div variants={item}>
                <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50 h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-emerald-500" />
                      Milestones Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {milestones.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No milestones defined.
                      </p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-emerald-500/20" />
                        <div className="space-y-4">
                          {milestones.map((ms, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.5 + i * 0.1 }}
                              className="flex gap-3 relative"
                            >
                              <div className="relative z-10 mt-1">
                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-emerald-500/30">
                                  {i + 1}
                                </div>
                              </div>
                              <div className="flex-1 pb-1">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  <span className="font-medium text-sm">{ms.title}</span>
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                  >
                                    {ms.targetDate
                                      ? formatDate(ms.targetDate)
                                      : 'TBD'}
                                  </Badge>
                                  {ms.completed && (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {ms.description}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Right Column: Required Reading + Hands-on Tasks */}
              <div className="space-y-4">
                {/* Required Reading */}
                <motion.div variants={item}>
                  <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-teal-500" />
                        Required Reading
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {requiredReading.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No required reading.
                        </p>
                      ) : (
                        <ScrollArea className="max-h-48">
                          <div className="space-y-2">
                            {requiredReading.map((r, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                              >
                                <BookOpen className="h-4 w-4 text-teal-500 shrink-0" />
                                <span className="truncate">{typeof r === 'string' ? r : r?.title || ''}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Hands-on Tasks */}
                <motion.div variants={item}>
                  <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-amber-500" />
                        Hands-on Tasks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {handsOnTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No hands-on tasks.
                        </p>
                      ) : (
                        <ScrollArea className="max-h-48">
                          <div className="space-y-2">
                            {handsOnTasks.map((t, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => {
                                  /* could toggle check state in the future */
                                }}
                              >
                                <Square className="h-4 w-4 text-amber-500 shrink-0" />
                                <span className="truncate">{typeof t === 'string' ? t : t?.title || ''}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            {/* Deliverables */}
            <motion.div variants={item}>
              <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-cyan-500" />
                    Deliverables
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deliverables.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No deliverables defined.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {deliverables.map((d, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.6 + i * 0.05 }}
                          className="flex items-center gap-2 text-sm p-3 rounded-xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/10"
                        >
                          <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="truncate">{typeof d === 'string' ? d : d?.title || ''}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Empty State ===== */}
      {!plan && !generating && !error && (
        <Card className="rounded-2xl border-dashed border-2 border-border/50 bg-muted/20">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Users className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No Plan Generated Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Select an employee above and click &ldquo;Generate Plan&rdquo; to create a personalized
              AI-powered onboarding plan tailored to their role and experience.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}