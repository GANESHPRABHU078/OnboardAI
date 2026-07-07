'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Palette,
  Bell,
  Shield,
  User,
  Globe,
  Monitor,
  Moon,
  Sun,
  Zap,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

const SettingToggle = ({ icon: Icon, title, description, checked, onChange }: {
  icon: React.ElementType; title: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted/50 mt-0.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [agentSuggestions, setAgentSuggestions] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  React.useEffect(() => { queueMicrotask(() => setMounted(true)); }, []);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-[oklch(0.55_0.2_270/0.1)]">
          <SettingsIcon className="h-5 w-5 text-[oklch(0.55_0.2_270)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Settings</h2>
          <p className="text-sm text-muted-foreground">Customize your experience</p>
        </div>
      </div>

      {/* Appearance */}
      <motion.div variants={item}>
        <Card className="rounded-xl border-border/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-[oklch(0.55_0.2_270)]" />
              <CardTitle className="text-base">Appearance</CardTitle>
            </div>
            <CardDescription>Customize how the platform looks</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Theme Selection */}
            <div className="mb-4">
              <Label className="text-sm font-medium mb-3 block">Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'light', icon: Sun, label: 'Light', desc: 'Clean and bright' },
                  { id: 'dark', icon: Moon, label: 'Dark', desc: 'Easy on the eyes' },
                  { id: 'system', icon: Monitor, label: 'System', desc: 'Follow your OS' },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = mounted && theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                        isActive
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border/30 hover:border-border/60 hover:bg-muted/30'
                      )}
                    >
                      <Icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                      <div className="text-center">
                        <p className={cn('text-sm font-medium', isActive && 'text-primary')}>{t.label}</p>
                        <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator className="my-4" />

            <SettingToggle
              icon={Eye}
              title="Compact Mode"
              description="Reduce spacing and font sizes for more content density"
              checked={compactMode}
              onChange={(v) => { setCompactMode(v); toast.success(v ? 'Compact mode enabled' : 'Compact mode disabled'); }}
            />
            <Separator />
            <SettingToggle
              icon={Zap}
              title="Animations"
              description="Enable smooth transitions and motion effects"
              checked={animationsEnabled}
              onChange={(v) => { setAnimationsEnabled(v); toast.success(v ? 'Animations enabled' : 'Animations disabled'); }}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications */}
      <motion.div variants={item}>
        <Card className="rounded-xl border-border/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[oklch(0.65_0.18_160)]" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </div>
            <CardDescription>Control how you receive updates</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingToggle
              icon={Bell}
              title="Email Notifications"
              description="Receive email updates for important events"
              checked={emailNotifications}
              onChange={(v) => { setEmailNotifications(v); toast.success(v ? 'Email notifications on' : 'Email notifications off'); }}
            />
            <Separator />
            <SettingToggle
              icon={Zap}
              title="AI Agent Suggestions"
              description="Show smart suggestions in the AI Agent chat"
              checked={agentSuggestions}
              onChange={(v) => { setAgentSuggestions(v); toast.success(v ? 'Agent suggestions on' : 'Agent suggestions off'); }}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* AI & Privacy */}
      <motion.div variants={item}>
        <Card className="rounded-xl border-border/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[oklch(0.6_0.22_310)]" />
              <CardTitle className="text-base">AI & Privacy</CardTitle>
            </div>
            <CardDescription>Control AI features and data usage</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingToggle
              icon={Globe}
              title="Auto-Save"
              description="Automatically save your progress as you work"
              checked={autoSave}
              onChange={(v) => { setAutoSave(v); toast.success(v ? 'Auto-save enabled' : 'Auto-save disabled'); }}
            />
            <Separator />
            <div className="py-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted/50 mt-0.5">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Data Retention</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Your conversation history with the AI agent is stored locally and can be deleted at any time.</p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => toast.success('Conversation history cleared')}>
                  Clear History
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Account */}
      <motion.div variants={item}>
        <Card className="rounded-xl border-border/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-[oklch(0.7_0.15_45)]" />
              <CardTitle className="text-base">Account</CardTitle>
            </div>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Name</Label>
                <Input value={user?.name || ''} disabled className="rounded-xl bg-muted/30" />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Email</Label>
                <Input value={user?.email || ''} disabled className="rounded-xl bg-muted/30" />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Role</Label>
                <Input value={user?.role || ''} disabled className="rounded-xl bg-muted/30 capitalize" />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">User ID</Label>
                <Input value={user?.id || ''} disabled className="rounded-xl bg-muted/30 font-mono text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}