'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Mail, Lock, Eye, EyeOff, ArrowRight, Database, Loader2, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export default function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoginError(null);
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setLoginError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seeding failed');
      toast.success('Demo data seeded! Credentials auto-filled.');
      setValue('email', 'admin@onboardai.com');
      setValue('password', 'admin123');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to seed demo data';
      toast.error(message);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 aurora-bg relative">
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[oklch(0.55_0.2_270/0.08)] blur-3xl animate-float-slow pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-[oklch(0.65_0.18_160/0.06)] blur-3xl animate-float-medium pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-[oklch(0.6_0.22_310/0.06)] blur-3xl animate-float-slow pointer-events-none" style={{ animationDelay: '-3s' }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-strong rounded-3xl overflow-hidden shadow-2xl shadow-black/5">
          {/* Header */}
          <div className="text-center pb-2 pt-10 px-8 relative">
            {/* Animated logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.15 }}
              className="mx-auto mb-5 relative"
            >
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[oklch(0.55_0.2_270)] via-[oklch(0.55_0.2_270/0.9)] to-[oklch(0.5_0.22_310)] text-white shadow-xl shadow-[oklch(0.55_0.2_270/0.25)] flex items-center justify-center">
                <BrainCircuit className="h-8 w-8" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/10 to-transparent" />
                {/* Orbiting sparkles */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-white/40"
                    animate={{
                      x: [0, Math.cos((i * Math.PI * 2) / 3 + Date.now() / 2000) * 36],
                      y: [0, Math.sin((i * Math.PI * 2) / 3 + Date.now() / 2000) * 36],
                      opacity: [0.6, 0, 0.6],
                      scale: [1, 0.3, 1],
                    }}
                    transition={{ duration: 4, repeat: Infinity, delay: i * 1.3, ease: 'easeInOut' }}
                    style={{ top: '50%', left: '50%', marginTop: -4, marginLeft: -4 }}
                  />
                ))}
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold tracking-tight"
            >
              <span className="gradient-text">Onboard</span>AI
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-muted-foreground mt-2"
            >
              Enterprise AI-powered onboarding platform
            </motion.p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8 pt-4">
            <AnimatePresence>
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                >
                  {loginError}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@company.com"
                    {...register('email')}
                    aria-invalid={!!errors.email}
                    className="h-11 rounded-xl bg-muted/40 border-border/40 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20 pl-10 transition-all"
                  />
                </div>
                {errors.email && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive">
                    {errors.email.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...register('password')}
                    aria-invalid={!!errors.password}
                    className="h-11 rounded-xl bg-muted/40 border-border/40 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20 pl-10 pr-10 transition-all"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
                {errors.password && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive">
                    {errors.password.message}
                  </motion.p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl btn-aurora font-medium disabled:opacity-50"
                disabled={isSubmitting}
              >
                <span className="relative z-10 flex items-center">
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </span>
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <button onClick={onSwitchToRegister} className="text-primary font-medium hover:underline underline-offset-2 transition-colors">
                  Register
                </button>
              </p>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-3 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="w-full h-11 rounded-xl border-dashed border-2 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
            >
              {isSeeding ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Seeding Demo Data...</>
              ) : (
                <><Database className="mr-2 h-4 w-4" />Seed Demo Data</>
              )}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground/60 text-center flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3" />
              Populates sample employees, departments & training plans
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}