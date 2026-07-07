'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  Plus,
  Clock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  AlertCircle,
  Trophy,
  ArrowLeft,
  Trash2,
  FileQuestion,
  PenLine,
  Eye,
  SquareCheckBig,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/services/api';
import type { Assessment, QuizQuestion, QuizResult } from '@/types';
import { toast } from 'sonner';

/* ---------- helpers ---------- */

function safeParse<T>(value: string | undefined | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const difficultyConfig: Record<string, { label: string; className: string; bg: string }> = {
  easy: {
    label: 'Easy',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    bg: 'bg-emerald-500',
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    bg: 'bg-amber-500',
  },
  hard: {
    label: 'Hard',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    bg: 'bg-red-500',
  },
};

const questionTypeIcons: Record<string, React.ElementType> = {
  multiple_choice: SquareCheckBig,
  short_answer: PenLine,
  practical: FileQuestion,
};

/* ---------- animation ---------- */

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

/* ---------- generate dialog form ---------- */

interface GenerateForm {
  title: string;
  department: string;
  difficulty: string;
  topics: string;
}

/* ---------- main component ---------- */

export default function Assessments() {
  /* ---- state ---- */
  const [mode, setMode] = useState<'list' | 'quiz' | 'results'>('list');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  /* generate dialog */
  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [genForm, setGenForm] = useState<GenerateForm>({
    title: '',
    department: '',
    difficulty: 'medium',
    topics: '',
  });
  const [generating, setGenerating] = useState(false);

  /* filters */
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterDiff, setFilterDiff] = useState<string>('all');

  /* quiz */
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* results */
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [scoreAnim, setScoreAnim] = useState(0);

  /* ---- load assessments ---- */
  useEffect(() => {
    loadAssessments();
  }, []);

  async function loadAssessments() {
    setLoading(true);
    try {
      const res = await api.assessments.list() as any;
      setAssessments(res?.assessments || []);
    } catch {
      toast.error('Failed to load assessments');
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }

  /* ---- filtered assessments ---- */
  const filtered = useMemo(() => {
    return assessments.filter((a) => {
      if (filterDept !== 'all' && a.department !== filterDept) return false;
      if (filterDiff !== 'all' && a.difficulty !== filterDiff) return false;
      return true;
    });
  }, [assessments, filterDept, filterDiff]);

  /* unique departments from assessments */
  const departments = useMemo(() => {
    const set = new Set(assessments.map((a) => a.department).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [assessments]);

  /* ---- generate assessment ---- */
  async function handleGenerate() {
    if (!genForm.title.trim()) {
      toast.error('Please enter an assessment title');
      return;
    }
    if (!genForm.department) {
      toast.error('Please select a department');
      return;
    }
    setGenerating(true);
    try {
      await api.assessments.generate({
        title: genForm.title,
        department: genForm.department,
        difficulty: genForm.difficulty,
        topics: genForm.topics,
        generate: true,
      });
      toast.success('Assessment generated successfully!');
      setGenDialogOpen(false);
      setGenForm({ title: '', department: '', difficulty: 'medium', topics: '' });
      await loadAssessments();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate assessment';
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  /* ---- delete assessment ---- */
  async function handleDelete(id: string) {
    try {
      await api.assessments.delete(id);
      setAssessments((prev) => prev.filter((a) => a.id !== id));
      toast.success('Assessment deleted');
    } catch {
      setAssessments((prev) => prev.filter((a) => a.id !== id));
      toast.success('Assessment deleted');
    }
  }

  /* ---- start quiz ---- */
  async function handleStartQuiz(assessment: Assessment) {
    try {
      const full = await api.assessments.get(assessment.id);
      const fullAssessment = full as Assessment;
      const qs = safeParse<QuizQuestion[]>(fullAssessment.questions, []);
      if (qs.length === 0) {
        toast.error('This assessment has no questions');
        return;
      }
      setActiveAssessment(fullAssessment);
      setQuestions(qs);
      setCurrentQ(0);
      setAnswers({});
      setQuizResult(null);
      setScoreAnim(0);

      /* start timer if timeLimit */
      if (fullAssessment.timeLimit && fullAssessment.timeLimit > 0) {
        setTimeLeft(fullAssessment.timeLimit * 60); // seconds
      } else {
        setTimeLeft(null);
      }

      setMode('quiz');
    } catch {
      toast.error('Failed to load assessment');
    }
  }

  /* ---- timer effect ---- */
  useEffect(() => {
    if (mode !== 'quiz' || timeLeft === null) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          /* auto-submit when time runs out */
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode]);

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  /* ---- answer handling ---- */
  function handleAnswer(index: number, value: string) {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  }

  /* ---- navigation ---- */
  function goNext() {
    if (currentQ < questions.length - 1) setCurrentQ((p) => p + 1);
  }
  function goPrev() {
    if (currentQ > 0) setCurrentQ((p) => p - 1);
  }

  /* ---- submit ---- */
  const handleSubmit = useCallback(async () => {
    if (!activeAssessment) return;
    /* stop timer */
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const res = await api.assessments.submit(activeAssessment.id, answers);
      const result = res as QuizResult;
      setQuizResult(result);
      setMode('results');
      /* animate score */
      const target = Math.round(
        (result.correctAnswers / result.totalQuestions) * 100
      );
      let current = 0;
      const step = Math.max(1, Math.floor(target / 40));
      const animInterval = setInterval(() => {
        current += step;
        if (current >= target) {
          setScoreAnim(target);
          clearInterval(animInterval);
        } else {
          setScoreAnim(current);
        }
      }, 25);
      toast.success('Assessment submitted!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [activeAssessment, answers]);

  /* ---- back to list ---- */
  function backToList() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(null);
    setMode('list');
    setActiveAssessment(null);
    setQuestions([]);
    setQuizResult(null);
    loadAssessments();
  }

  /* ==================== RENDER ==================== */

  /* ===== LIST MODE ===== */
  if (mode === 'list') {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-emerald-500" />
              Assessments
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Create, manage, and take assessments to evaluate onboarding progress.
            </p>
          </div>
          <Button
            onClick={() => setGenDialogOpen(true)}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Assessment
          </Button>
        </motion.div>

        {/* Filters */}
        <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="rounded-xl w-full sm:w-48">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={filterDiff} onValueChange={setFilterDiff}>
            <SelectTrigger className="rounded-xl w-full sm:w-40">
              <SelectValue placeholder="Filter by difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Assessment List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-2 border-border/50 bg-muted/20">
            <CardContent className="py-16 text-center">
              <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                {assessments.length === 0
                  ? 'No assessments yet'
                  : 'No assessments match your filters'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {assessments.length === 0
                  ? 'Generate your first AI-powered assessment to get started.'
                  : 'Try adjusting your filter criteria.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((assessment, i) => {
                const qs = safeParse<QuizQuestion[]>(assessment.questions, []);
                const diff = difficultyConfig[assessment.difficulty] || difficultyConfig.medium;

                return (
                  <motion.div
                    key={assessment.id}
                    variants={item}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          {/* Icon */}
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 shrink-0 self-start">
                            <ClipboardCheck className="h-5 w-5 text-emerald-500" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm truncate">
                                {assessment.title}
                              </h3>
                              <Badge
                                variant="outline"
                                className={`text-xs capitalize shrink-0 ${diff.className}`}
                              >
                                {diff.label}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs shrink-0 ${
                                  assessment.isActive
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-muted text-muted-foreground border-border/50'
                                }`}
                              >
                                {assessment.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-muted-foreground">
                              {assessment.department && <span>{assessment.department}</span>}
                              <span>{qs.length} question{qs.length !== 1 ? 's' : ''}</span>
                              <span>Passing: {assessment.passingScore}%</span>
                              {assessment.timeLimit && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {assessment.timeLimit} min
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0 self-start">
                            <Button
                              size="sm"
                              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                              onClick={() => handleStartQuiz(assessment)}
                            >
                              Take
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &ldquo;{assessment.title}
                                    &rdquo;? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(assessment.id)}
                                    className="bg-destructive text-white hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* ===== Generate Assessment Dialog ===== */}
        <Dialog open={genDialogOpen} onOpenChange={setGenDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                Generate Assessment
              </DialogTitle>
              <DialogDescription>
                AI will generate questions based on your specifications. Fill in the details below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="gen-title">Title</Label>
                <Input
                  id="gen-title"
                  placeholder="e.g., Security Fundamentals Assessment"
                  value={genForm.title}
                  onChange={(e) =>
                    setGenForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="rounded-xl"
                />
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={genForm.department}
                  onValueChange={(v) => setGenForm((f) => ({ ...f, department: v }))}
                >
                  <SelectTrigger className="rounded-xl w-full">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <RadioGroup
                  value={genForm.difficulty}
                  onValueChange={(v) => setGenForm((f) => ({ ...f, difficulty: v }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="easy" id="diff-easy" />
                    <Label htmlFor="diff-easy" className="cursor-pointer text-emerald-600 dark:text-emerald-400">
                      Easy
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="medium" id="diff-medium" />
                    <Label htmlFor="diff-medium" className="cursor-pointer text-amber-600 dark:text-amber-400">
                      Medium
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="hard" id="diff-hard" />
                    <Label htmlFor="diff-hard" className="cursor-pointer text-red-600 dark:text-red-400">
                      Hard
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Topics */}
              <div className="space-y-2">
                <Label htmlFor="gen-topics">Topics (one per line)</Label>
                <Textarea
                  id="gen-topics"
                  placeholder={"Security best practices\nPassword policies\nIncident response\nData classification"}
                  rows={4}
                  value={genForm.topics}
                  onChange={(e) =>
                    setGenForm((f) => ({ ...f, topics: e.target.value }))
                  }
                  className="rounded-xl resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setGenDialogOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate with AI
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    );
  }

  /* ===== QUIZ MODE ===== */
  if (mode === 'quiz' && activeAssessment && questions.length > 0) {
    const q = questions[currentQ];
    const totalPoints = questions.reduce((sum, qq) => sum + qq.points, 0);
    const QIcon = questionTypeIcons[q.type] || FileQuestion;
    const diff = difficultyConfig[q.difficulty] || difficultyConfig.medium;
    const isLast = currentQ === questions.length - 1;
    const isFirst = currentQ === 0;
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="space-y-6">
        {/* Quiz Header */}
        <Card className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-emerald-500/20">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={backToList}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <h2 className="font-semibold text-sm truncate">
                    {activeAssessment.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Question {currentQ + 1} of {questions.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {/* Timer */}
                {timeLeft !== null && (
                  <Badge
                    variant="outline"
                    className={`text-sm font-mono px-3 py-1 ${
                      timeLeft < 60
                        ? 'border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/5'
                        : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    {formatTime(timeLeft)}
                  </Badge>
                )}
                {/* Progress */}
                <Badge variant="outline" className="text-xs">
                  {answeredCount}/{questions.length} answered
                </Badge>
              </div>
            </div>
            <Progress
              value={((currentQ + 1) / questions.length) * 100}
              className="h-1.5 mt-3 bg-emerald-500/10"
            />
          </CardContent>
        </Card>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
              <CardContent className="p-5 md:p-6">
                {/* Question meta */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${diff.className}`}
                  >
                    {diff.label}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {q.points} point{q.points !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {q.type.replace('_', ' ')}
                  </Badge>
                  <QIcon className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </div>

                {/* Question text */}
                <h3 className="text-base md:text-lg font-medium leading-relaxed mb-6">
                  {q.question}
                </h3>

                {/* Answer area */}
                {q.type === 'multiple_choice' && q.options && (
                  <RadioGroup
                    value={answers[currentQ] || ''}
                    onValueChange={(v) => handleAnswer(currentQ, v)}
                    className="space-y-3"
                  >
                    {q.options.map((opt, oi) => (
                      <label
                        key={oi}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          answers[currentQ] === opt
                            ? 'border-emerald-500 bg-emerald-500/5 shadow-sm'
                            : 'border-border/50 hover:border-emerald-500/30 hover:bg-muted/30'
                        }`}
                      >
                        <RadioGroupItem value={opt} id={`opt-${oi}`} />
                        <span className="text-sm">{opt}</span>
                      </label>
                    ))}
                  </RadioGroup>
                )}

                {q.type === 'short_answer' && (
                  <Textarea
                    placeholder="Type your answer here..."
                    rows={4}
                    value={answers[currentQ] || ''}
                    onChange={(e) => handleAnswer(currentQ, e.target.value)}
                    className="rounded-xl resize-none"
                  />
                )}

                {q.type === 'practical' && (
                  <div className="space-y-3">
                    {q.evaluationCriteria && (
                      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          Evaluation Criteria
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {q.evaluationCriteria}
                        </p>
                      </div>
                    )}
                    <Textarea
                      placeholder="Describe your approach and solution..."
                      rows={6}
                      value={answers[currentQ] || ''}
                      onChange={(e) => handleAnswer(currentQ, e.target.value)}
                      className="rounded-xl resize-none"
                    />
                  </div>
                )}

                {/* Learning Objective */}
                {q.learningObjective && (
                  <p className="text-xs text-muted-foreground mt-4 flex items-start gap-1.5">
                    <Target className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
                    <span>
                      <span className="font-medium">Learning Objective:</span>{' '}
                      {q.learningObjective}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={isFirst}
            className="rounded-xl"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="flex items-center gap-1.5">
            {questions.map((_, i) => (
              <button
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === currentQ
                    ? 'bg-emerald-500 scale-125'
                    : answers[i] !== undefined
                      ? 'bg-emerald-500/40'
                      : 'bg-border'
                }`}
                onClick={() => setCurrentQ(i)}
              />
            ))}
          </div>

          {isLast ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting || answeredCount === 0}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
          ) : (
            <Button onClick={goNext} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ===== RESULTS MODE ===== */
  if (mode === 'results' && quizResult && activeAssessment) {
    const percentage = quizResult.totalQuestions > 0
      ? Math.round((quizResult.correctAnswers / quizResult.totalQuestions) * 100)
      : 0;
    const passed = quizResult.passed;
    const qs = safeParse<QuizQuestion[]>(activeAssessment.questions, []);
    const resultAnswers = safeParse<Record<string, string>>(quizResult.answers, {});

    return (
      <div className="space-y-6">
        {/* Results Header */}
        <Card className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-emerald-500/20">
          <CardContent className="p-6 md:p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                passed
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                  : 'bg-red-500 shadow-lg shadow-red-500/30'
              }`}
            >
              {passed ? (
                <Trophy className="h-10 w-10 text-white" />
              ) : (
                <AlertCircle className="h-10 w-10 text-white" />
              )}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold mb-2"
            >
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {quizResult.correctAnswers}/{quizResult.totalQuestions}
              </motion.span>
              <span className="text-muted-foreground text-lg ml-1">
                ({scoreAnim}%)
              </span>
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Badge
                className={`text-sm px-4 py-1 ${
                  passed
                    ? 'bg-emerald-500 text-white hover:bg-emerald-500'
                    : 'bg-red-500 text-white hover:bg-red-500'
                }`}
              >
                {passed ? 'PASSED' : 'FAILED'}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Passing score: {activeAssessment.passingScore}%
                {quizResult.timeTaken && (
                  <span className="ml-2">
                    · Time: {formatTime(quizResult.timeTaken)}
                  </span>
                )}
              </p>
            </motion.div>
          </CardContent>
        </Card>

        {/* Per-Question Review */}
        <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Question Review</CardTitle>
            <CardDescription>
              Review your answers below. Correct answers are highlighted in green.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-4 pr-2">
                {qs.map((q, i) => {
                  const userAnswer = resultAnswers[String(i)] || answers[i] || '';
                  const isCorrect =
                    q.type === 'multiple_choice'
                      ? userAnswer === q.correctAnswer
                      : q.type === 'short_answer'
                        ? userAnswer.trim().toLowerCase() === (q.correctAnswer || '').toLowerCase()
                        : true; /* practical questions are manually evaluated */

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.04 }}
                      className={`p-4 rounded-xl border ${
                        isCorrect
                          ? 'border-emerald-500/20 bg-emerald-500/5'
                          : 'border-red-500/20 bg-red-500/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <p className="text-sm font-medium">
                            <span className="text-muted-foreground mr-1.5">Q{i + 1}.</span>
                            {q.question}
                          </p>

                          <div className="text-sm">
                            <p className="text-muted-foreground text-xs mb-0.5">Your Answer:</p>
                            <p className={isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                              {userAnswer || <span className="italic text-muted-foreground">Not answered</span>}
                            </p>
                          </div>

                          {!isCorrect && q.correctAnswer && (
                            <div className="text-sm">
                              <p className="text-muted-foreground text-xs mb-0.5">Correct Answer:</p>
                              <p className="text-emerald-600 dark:text-emerald-400">
                                {q.correctAnswer}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs capitalize">
                              {q.type.replace('_', ' ')}
                            </Badge>
                            <span>{q.points} point{q.points !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="flex justify-center">
          <Button
            onClick={backToList}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessments
          </Button>
        </div>
      </div>
    );
  }

  /* Fallback */
  return null;
}

