'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  TrendingUp,
  BookOpen,
  Compass,
  Shield,
  ClipboardCheck,
  Award,
  RotateCcw,
  ChevronRight,
  Loader2,
  Zap,
  MessageSquare,
  BrainCircuit,
  Database,
  FileSearch,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  toolCalls?: { tool: string; result: string }[];
  suggestions?: string[];
}

interface SuggestionItem {
  text: string;
  icon: string;
}

const toolIconMap: Record<string, React.ElementType> = {
  get_progress: TrendingUp,
  search_documents: FileSearch,
  get_training_plan: BookOpen,
  get_assessment_results: ClipboardCheck,
  get_policies: Shield,
  get_next_task: Compass,
  generate_certificate_check: Award,
};

const toolLabelMap: Record<string, string> = {
  get_progress: 'Checked Progress',
  search_documents: 'Searched Documents',
  get_training_plan: 'Training Plan',
  get_assessment_results: 'Assessment Scores',
  get_policies: 'Retrieved Policies',
  get_next_task: 'Next Task',
  generate_certificate_check: 'Certificate Check',
};

const suggestionIconMap: Record<string, React.ElementType> = {
  trending_up: TrendingUp, book_open: BookOpen, compass: Compass, shield: Shield,
  clipboard_check: ClipboardCheck, award: Award, users: Database, bar_chart_3: TrendingUp,
  lightbulb: Lightbulb, zap: Zap, target: Target, database: Database,
};

const messageVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.05, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

function Target(props: React.SVGProps<SVGSVGElement>) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}

export default function AIAgentChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [typingStep, setTypingStep] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingRef = useRef<ReturnType<typeof setInterval>>();

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token')}` });

  useEffect(() => {
    fetch('/api/agent/suggestions', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.suggestions) setSuggestions(d.suggestions); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (isLoading) {
      setTypingStep(0);
      typingRef.current = setInterval(() => setTypingStep(p => (p + 1) % 4), 600);
    } else if (typingRef.current) {
      clearInterval(typingRef.current);
    }
    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, [isLoading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: text.trim(), conversationId }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.conversationId && !conversationId) setConversationId(data.conversationId);
        setMessages(prev => [...prev, {
          id: `a-${Date.now()}`, role: 'agent', content: data.message,
          timestamp: new Date(), toolCalls: data.toolCalls, suggestions: data.suggestions,
        }]);
        if (data.suggestions?.length) {
          setSuggestions(data.suggestions.map((s: string, i: number) => ({
            text: s, icon: ['trending_up', 'book_open', 'compass', 'shield', 'clipboard_check'][i % 5],
          })));
        }
      } else {
        setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'agent', content: data.error || 'Something went wrong.', timestamp: new Date() }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'agent', content: 'Connection issue. Please try again.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const userInitials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  /* ═══ WELCOME SCREEN ═══ */
  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-400/3 rounded-full blur-3xl" />
        </div>

        <div className="relative flex-1 flex flex-col items-center justify-center px-4">
          <motion.div className="relative mb-8" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}>
            <motion.div className="absolute inset-0 rounded-full border-2 border-emerald-500/30" animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="absolute -inset-3 rounded-full border border-emerald-400/15" animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} />
            <motion.div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 shadow-2xl shadow-emerald-500/30 flex items-center justify-center" whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300 }}>
              <BrainCircuit className="w-10 h-10 text-white" />
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div key={i} className="absolute w-2 h-2 rounded-full bg-white/60" animate={{ x: [0, Math.cos((i * Math.PI * 2) / 5) * 40], y: [0, Math.sin((i * Math.PI * 2) / 5) * 40], opacity: [0.8, 0], scale: [1, 0.3] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.6, ease: 'easeInOut' }} style={{ top: '50%', left: '50%', marginTop: -4, marginLeft: -4 }} />
              ))}
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center mb-2">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent">OnboardAI Agent</h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-md">Your intelligent onboarding assistant. Ask about your progress, search documents, or get personalized guidance.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl w-full mt-8 px-4">
            {suggestions.map((sug, i) => {
              const IconComp = suggestionIconMap[sug.icon] || Lightbulb;
              return (
                <motion.button key={sug.text} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.07 }} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => sendMessage(sug.text)} className="group relative flex items-start gap-3 p-4 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm hover:bg-card/90 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 text-left">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors leading-relaxed">{sug.text}</span>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/0 group-hover:text-emerald-500 transition-all duration-300 group-hover:translate-x-0.5" />
                </motion.button>
              );
            })}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="w-full max-w-2xl mt-8 px-4">
            <div className="relative flex items-end gap-2 p-3 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-lg shadow-black/5">
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask OnboardAI Agent anything..." rows={1} className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground/60 min-h-[40px] max-h-[120px] py-2 px-1" style={{ fieldSizing: 'content' }} />
              <Button size="icon" onClick={() => sendMessage(input)} disabled={!input.trim()} className="shrink-0 h-10 w-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 disabled:opacity-40 transition-all duration-300">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground/50 mt-3">OnboardAI Agent uses your onboarding data to provide personalized assistance</p>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ═══ CHAT VIEW ═══ */
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/40 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">OnboardAI Agent</h2>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">Online</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Intelligent onboarding assistant</p>
          </div>
        </div>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setMessages([]); setConversationId(null); inputRef.current?.focus(); }}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New Chat</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="max-w-3xl mx-auto py-6 space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isAgent = msg.role === 'agent';
              return (
                <motion.div key={msg.id} custom={idx} variants={messageVariants} initial="hidden" animate="visible" exit="exit" layout className={cn('flex gap-3', isAgent ? 'justify-start' : 'justify-end')}>
                  {isAgent && (
                    <div className="shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                        <BrainCircuit className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                  <div className={cn('max-w-[80%] space-y-2', !isAgent && 'items-end flex flex-col')}>
                    {isAgent && msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {msg.toolCalls.map((tc, ti) => {
                          const ToolIcon = toolIconMap[tc.tool] || Database;
                          return (
                            <motion.div key={ti} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: ti * 0.1 }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs">
                              <ToolIcon className="w-3 h-3" />
                              <span>{toolLabelMap[tc.tool] || tc.tool}</span>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                    <motion.div className={cn('px-4 py-3 text-sm leading-relaxed', isAgent ? 'rounded-2xl rounded-tl-md bg-card border border-border/50 shadow-sm' : 'rounded-2xl rounded-tr-md bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/15')}>
                      {msg.content.split('\n').map((line, li) => (
                        <React.Fragment key={li}>
                          {line.startsWith('- ') || line.startsWith('* ') ? (
                            <span className="flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-1 shrink-0 opacity-60" /><span>{line.replace(/^[-*]\s/, '')}</span></span>
                          ) : line.match(/^\*\*(.+)\*\*$/) ? (
                            <span className="font-semibold">{line.replace(/\*\*/g, '')}</span>
                          ) : (
                            <span>{line}</span>
                          )}
                          {li < msg.content.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </motion.div>
                    <p className="text-[10px] text-muted-foreground/60 px-1">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    {isAgent && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.suggestions.slice(0, 3).map((sug, si) => (
                          <motion.button key={si} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + si * 0.1 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => sendMessage(sug)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-border/60 bg-card/60 hover:bg-card hover:border-emerald-500/30 text-muted-foreground hover:text-foreground transition-all duration-200">
                            <Zap className="w-3 h-3 text-emerald-500" />{sug}
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                  {!isAgent && (
                    <div className="shrink-0 mt-1">
                      <Avatar className="h-8 w-8"><AvatarFallback className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">{userInitials}</AvatarFallback></Avatar>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Typing indicator */}
            {isLoading && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <BrainCircuit className="w-4 h-4 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-card border border-border/50 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Thinking</span>
                      <div className="flex gap-0.5">
                        {[0, 1, 2].map(d => (
                          <motion.div key={d} className="w-1.5 h-1.5 rounded-full bg-emerald-500" animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }} />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {['Analyzing', 'Retrieving', 'Responding'].map((step, i) => (
                        <motion.span key={step} className={cn('text-[10px] px-1.5 py-0.5 rounded-md transition-colors duration-300', typingStep >= i ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground/40')}>{step}</motion.span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border/50 bg-card/40 backdrop-blur-sm p-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          {messages.length > 0 && suggestions.length > 0 && !isLoading && (
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
              {suggestions.slice(0, 4).map((sug, i) => {
                const IconComp = suggestionIconMap[sug.icon] || Lightbulb;
                return (
                  <motion.button key={sug.text} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => sendMessage(sug.text)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-border/50 bg-card/60 hover:bg-card hover:border-emerald-500/30 text-muted-foreground hover:text-foreground whitespace-nowrap transition-all duration-200 shrink-0">
                    <IconComp className="w-3 h-3 text-emerald-500" />{sug.text}
                  </motion.button>
                );
              })}
            </div>
          )}
          <div className="relative flex items-end gap-2 p-2 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-lg shadow-black/5 focus-within:border-emerald-500/40 focus-within:shadow-emerald-500/5 transition-all duration-300">
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask OnboardAI Agent anything..." rows={1} disabled={isLoading} className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground/60 min-h-[36px] max-h-[120px] py-1.5 px-2 disabled:opacity-50" style={{ fieldSizing: 'content' }} />
            <Button size="icon" onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading} className="shrink-0 h-9 w-9 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 disabled:opacity-40 transition-all duration-300">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/40 mt-2">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}