'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import LoadingScreen from '@/components/layout/LoadingScreen';
import LoginPage from '@/components/auth/LoginPage';
import RegisterPage from '@/components/auth/RegisterPage';
import Dashboard from '@/components/dashboard/Dashboard';
import EmployeeManagement from '@/components/employees/EmployeeManagement';
import OnboardingGenerator from '@/components/onboarding/OnboardingGenerator';
import RAGDocuments from '@/components/rag/RAGDocuments';
import Assessments from '@/components/assessments/Assessments';
import ProgressTracking from '@/components/progress/ProgressTracking';
import Certificates from '@/components/certificates/Certificates';
import AdminPanel from '@/components/admin/AdminPanel';
import AIAgentChat from '@/components/agent/AIAgentChat';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import TaskManagement from '@/components/tasks/TaskManagement';
import Analytics from '@/components/analytics/Analytics';
import Settings from '@/components/settings/Settings';

const viewTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  agent: 'AI Agent',
  notifications: 'Notifications',
  tasks: 'Tasks',
  employees: 'Employee Management',
  onboarding: 'AI Onboarding Generator',
  rag: 'Documents',
  assessments: 'Assessments',
  progress: 'Progress Tracking',
  analytics: 'Analytics & Reporting',
  certificates: 'Certificates',
  settings: 'Settings',
  admin: 'Admin Panel',
};

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const res = await fetch('/api/notifications?limit=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      queueMicrotask(() => fetchUnreadCount());
    };
    load();
    const interval = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isAuthenticated, fetchUnreadCount]);

  useEffect(() => {
    if (activeView === 'notifications') {
      queueMicrotask(() => fetchUnreadCount());
    }
  }, [activeView, fetchUnreadCount]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    if (authView === 'register') {
      return <RegisterPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthView('register')} />;
  }

  function renderContent() {
    switch (activeView) {
      case 'dashboard': return <Dashboard />;
      case 'agent': return <AIAgentChat />;
      case 'notifications': return <NotificationPanel />;
      case 'tasks': return <TaskManagement />;
      case 'employees': return <EmployeeManagement />;
      case 'onboarding': return <OnboardingGenerator />;
      case 'rag': return <RAGDocuments />;
      case 'assessments': return <Assessments />;
      case 'progress': return <ProgressTracking />;
      case 'analytics': return <Analytics />;
      case 'certificates': return <Certificates />;
      case 'settings': return <Settings />;
      case 'admin': return <AdminPanel />;
      default: return <Dashboard />;
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeView={activeView} onNavigate={setActiveView} unreadCount={unreadCount} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={viewTitles[activeView] || 'Dashboard'}
          onNotificationClick={() => setActiveView('notifications')}
        />

        <main className="flex-1 p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}